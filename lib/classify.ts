import Anthropic from "@anthropic-ai/sdk";
import type { Priority, Effort, Status } from "@/types/app";

function getClient() {
  return new Anthropic({ apiKey: process.env.APP_ANTHROPIC_KEY });
}

export interface ClassifyResult {
  titleCleaned: string;
  areaId:       string | null;
  newArea:      { name: string; groupName: string } | null;
  priority:     Priority;
  effort:       Effort;
  status:       Status;
  waitingOn:    string | null;
  notes:        string | null;
}

export interface ClassifyContext {
  areas:       { id: string; name: string; groupName: string }[];
  recentTasks: { title: string; areaName: string; priority: Priority }[];
}

export async function classifyTask(
  rawText: string,
  ctx: ClassifyContext
): Promise<ClassifyResult> {
  const { areas, recentTasks } = ctx;

  const fallback: ClassifyResult = {
    titleCleaned: rawText,
    areaId:       areas.find((a) => a.name.toLowerCase().includes("inbox"))?.id ?? areas[0]?.id ?? null,
    newArea:      null,
    priority:     "P2",
    effort:       "Medium",
    status:       "Todo",
    waitingOn:    null,
    notes:        null,
  };

  if (!process.env.APP_ANTHROPIC_KEY) {
    console.warn("[classify] APP_ANTHROPIC_KEY not set — using fallback defaults");
    return fallback;
  }
  if (areas.length === 0) return fallback;

  const areaList = areas
    .map((a) => `  { "id": "${a.id}", "group": "${a.groupName}", "name": "${a.name}" }`)
    .join("\n");

  const taskContext = recentTasks.length > 0
    ? recentTasks
        .slice(0, 20)
        .map((t) => `  - [${t.priority}] "${t.title}" → ${t.areaName}`)
        .join("\n")
    : "  (none yet)";

  const safeText = rawText.replace(/</g, "&lt;").replace(/>/g, "&gt;").slice(0, 600);

  const prompt = `You are an expert task classifier for a personal task tracker used by a knowledge worker. Your job is to deeply understand the intent, urgency, and context behind a raw task note — often written quickly and informally — and fill in all fields accurately.

## User's Areas (buckets for their work)
${areaList}

## Recent tasks (for pattern context — see how they map topics to areas)
${taskContext}

## Task to classify
\`\`\`
${safeText}
\`\`\`

## Instructions

Analyze the task text carefully. Consider:
- **Tone and urgency signals**: Words like "ASAP", "urgent", "blocking", "broken", "need now", "today", "before the call", "on fire", "demo tomorrow", "going live" → P0. "This week", "by Friday", "soon", "following up" → P1. Default to P2 for normal work. "Someday", "eventually", "nice to have", "explore", "low priority" → P3.
- **Effort signals**: "quick", "1-liner", "just", "easy fix", "2 min", "call", "email", "sync" → Quick. "review", "investigate", "meeting", "write", "update", "check" → Medium. "build", "design", "research", "deep dive", "refactor", "architect", "launch", "ship" → Deep.
- **Status signals**: "waiting for X", "blocked by Y", "waiting on Z to respond", "pending X" → status "Waiting On" with waitingOn set to who/what. "currently working on", "in the middle of", "halfway through" → "In Progress". Otherwise → "Todo".
- **Area matching**: Use the recent task patterns to understand how this user maps topics to areas. If the task clearly belongs to one of the existing areas, use it. If it clearly does NOT fit any existing area and represents a meaningfully distinct new category of work, propose a new area instead.
- **New area rule**: Only create a new area if the task is genuinely outside all existing areas AND the topic seems recurring (not a one-off). A new area name should be short (2-3 words max), title-case, and the groupName should match one of the existing group names or be "General" if truly new.
- **Notes**: If the raw text contains extra context beyond the core action (e.g., a link, a name, a specific number, a deadline detail), extract it as a short note. Otherwise null.
- **Title**: Rewrite as a crisp action item starting with a strong verb. Preserve specific names, numbers, and deadlines from the original. Remove filler. Max 120 chars.

Respond with ONLY a valid JSON object — no explanation, no markdown fences:

{
  "titleCleaned": "string — crisp action item with verb",
  "areaId": "string or null — ID from the areas list, null only if proposing a new area",
  "newArea": null or { "name": "Short Area Name", "groupName": "Existing or General" },
  "priority": "P0" | "P1" | "P2" | "P3",
  "effort": "Quick" | "Medium" | "Deep",
  "status": "Todo" | "In Progress" | "Waiting On",
  "waitingOn": "string or null — who/what if status is Waiting On",
  "notes": "string or null — extra context extracted from the message"
}`;

  try {
    const message = await getClient().messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 350,
      messages:   [{ role: "user", content: prompt }],
    });

    const block = message.content[0];
    if (!block || block.type !== "text") {
      throw new Error("Unexpected response format from AI");
    }

    const raw     = block.text.trim();
    const jsonStr = raw.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed  = JSON.parse(jsonStr) as Record<string, unknown>;

    const validPriorities: Priority[] = ["P0", "P1", "P2", "P3"];
    const validEfforts:    Effort[]   = ["Quick", "Medium", "Deep"];
    const validStatuses:   Status[]   = ["Todo", "In Progress", "Waiting On", "Done"];
    const validAreaIds                = new Set(areas.map((a) => a.id));

    // Resolve area — prefer areaId, fall back to newArea
    let resolvedAreaId: string | null = null;
    let resolvedNewArea: { name: string; groupName: string } | null = null;

    if (typeof parsed.areaId === "string" && validAreaIds.has(parsed.areaId)) {
      resolvedAreaId = parsed.areaId;
    } else if (
      parsed.newArea &&
      typeof parsed.newArea === "object" &&
      typeof (parsed.newArea as Record<string, unknown>).name === "string" &&
      typeof (parsed.newArea as Record<string, unknown>).groupName === "string"
    ) {
      const na = parsed.newArea as Record<string, unknown>;
      resolvedNewArea = {
        name:      (na.name as string).slice(0, 50),
        groupName: (na.groupName as string).slice(0, 50),
      };
    } else {
      resolvedAreaId = fallback.areaId;
    }

    const status = validStatuses.includes(parsed.status as Status)
      ? (parsed.status as Status)
      : "Todo";

    return {
      titleCleaned: typeof parsed.titleCleaned === "string" && parsed.titleCleaned.trim()
        ? parsed.titleCleaned.trim().slice(0, 200)
        : rawText,
      areaId:    resolvedAreaId,
      newArea:   resolvedNewArea,
      priority:  validPriorities.includes(parsed.priority as Priority) ? (parsed.priority as Priority) : "P2",
      effort:    validEfforts.includes(parsed.effort as Effort)         ? (parsed.effort as Effort)       : "Medium",
      status,
      waitingOn: status === "Waiting On" && typeof parsed.waitingOn === "string" && parsed.waitingOn.trim()
        ? parsed.waitingOn.trim().slice(0, 200)
        : null,
      notes: typeof parsed.notes === "string" && parsed.notes.trim()
        ? parsed.notes.trim().slice(0, 500)
        : null,
    };
  } catch (err) {
    console.error("[classify] error:", err);
    return fallback;
  }
}
