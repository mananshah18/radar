import Anthropic from "@anthropic-ai/sdk";
import type { Priority, Effort, Status } from "@/types/app";

function getClient() {
  return new Anthropic({ apiKey: process.env.APP_ANTHROPIC_KEY });
}

export interface ClassifyResult {
  titleCleaned:   string;
  categoryId:     string | null;
  subcategoryId:  string | null;
  newCategory:    { name: string } | null;
  newSubcategory: { name: string } | null; // create under categoryId (only when categoryId is set)
  priority:       Priority;
  effort:         Effort;
  status:         Status;
  waitingOn:      string | null;
  notes:          string | null;
}

export interface ClassifyContext {
  categories:  { id: string; name: string; subcategories: { id: string; name: string }[] }[];
  recentTasks: { title: string; categoryName: string; priority: Priority }[];
}

export async function classifyTask(
  rawText: string,
  ctx: ClassifyContext
): Promise<ClassifyResult> {
  const { categories, recentTasks } = ctx;

  const fallback: ClassifyResult = {
    titleCleaned:   rawText,
    categoryId:     categories.find((c) => c.name.toLowerCase().includes("inbox"))?.id ?? categories[0]?.id ?? null,
    subcategoryId:  null,
    newCategory:    null,
    newSubcategory: null,
    priority:       "P2",
    effort:         "Medium",
    status:         "Todo",
    waitingOn:      null,
    notes:          null,
  };

  if (!process.env.APP_ANTHROPIC_KEY) {
    console.warn("[classify] APP_ANTHROPIC_KEY not set — using fallback defaults");
    return fallback;
  }

  const categoryList = categories.length > 0
    ? categories.map((c) => {
        const subs = c.subcategories.length > 0
          ? c.subcategories.map((s) => `      { "id": "${s.id}", "name": "${s.name}" }`).join("\n")
          : "      (none)";
        return `  { "id": "${c.id}", "name": "${c.name}", "subcategories": [\n${subs}\n  ] }`;
      }).join("\n")
    : "  (none yet — you must propose a new category)";

  const taskContext = recentTasks.length > 0
    ? recentTasks
        .slice(0, 20)
        .map((t) => `  - [${t.priority}] "${t.title}" → ${t.categoryName}`)
        .join("\n")
    : "  (none yet)";

  const safeText = rawText.replace(/</g, "&lt;").replace(/>/g, "&gt;").slice(0, 600);

  const prompt = `You are an expert task classifier for a personal task tracker used by a knowledge worker. Your job is to deeply understand the intent, urgency, and context behind a raw task note and fill in all fields accurately.

## User's Categories (top-level buckets, e.g. Work, Personal)
${categoryList}

## Recent tasks (for pattern context)
${taskContext}

## Task to classify
\`\`\`
${safeText}
\`\`\`

## Instructions

Analyze the task carefully. Consider:
- **Tone and urgency signals**: "ASAP", "urgent", "blocking", "broken", "today", "demo tomorrow" → P0. "This week", "by Friday", "soon" → P1. Default P2. "Someday", "eventually", "nice to have" → P3.
- **Effort signals**: "quick", "just", "2 min", "call", "email" → Quick. "review", "write", "meeting", "check" → Medium. "build", "design", "research", "launch", "ship" → Deep.
- **Status signals**: "waiting for X", "blocked by Y" → "Waiting On" with waitingOn set. "currently working on" → "In Progress". Otherwise → "Todo".
- **Category matching**: Assign to the most fitting existing category. Use recent task patterns to understand how the user maps topics to categories. If the task does NOT fit any existing category, propose a new one.
- **Subcategory matching**: Within the chosen category, assign to an existing subcategory if one fits. If the task represents a distinct recurring sub-topic not covered by existing subcategories, propose a new subcategory name. Subcategory is optional — do not force one if unnecessary.
- **New category rule**: Only create a new category if the task is genuinely outside all existing categories AND represents recurring work. Name should be short (1-3 words), title-case. If there are NO existing categories, you MUST propose a new one.
- **Notes**: Extract extra context (links, names, numbers, deadline details) as a short note. Otherwise null.
- **Title**: Rewrite as a crisp action item starting with a strong verb. Max 120 chars.

Respond with ONLY a valid JSON object — no explanation, no markdown fences:

{
  "titleCleaned": "string",
  "categoryId": "string or null — ID from the categories list, null only if proposing a new category",
  "subcategoryId": "string or null — subcategory ID within the chosen category, null if none fits or proposing new",
  "newCategory": null or { "name": "Short Category Name" },
  "newSubcategory": null or { "name": "Short Subcategory Name" },
  "priority": "P0" | "P1" | "P2" | "P3",
  "effort": "Quick" | "Medium" | "Deep",
  "status": "Todo" | "In Progress" | "Waiting On",
  "waitingOn": "string or null",
  "notes": "string or null"
}

Rules:
- If categoryId is set, newCategory must be null
- If subcategoryId is set, newSubcategory must be null
- newSubcategory can only be set when categoryId is set (not when newCategory is set)`;

  try {
    const message = await getClient().messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages:   [{ role: "user", content: prompt }],
    });

    const block = message.content[0];
    if (!block || block.type !== "text") {
      throw new Error("Unexpected response format from AI");
    }

    const raw     = block.text.trim();
    const jsonStr = raw.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed  = JSON.parse(jsonStr) as Record<string, unknown>;

    const validPriorities:    Priority[]  = ["P0", "P1", "P2", "P3"];
    const validEfforts:       Effort[]    = ["Quick", "Medium", "Deep"];
    const validStatuses:      Status[]    = ["Todo", "In Progress", "Waiting On", "Done"];
    const validCategoryIds               = new Set(categories.map((c) => c.id));
    const validSubcategoryIds            = new Set(categories.flatMap((c) => c.subcategories.map((s) => s.id)));

    // Resolve category
    let resolvedCategoryId:     string | null = null;
    let resolvedSubcategoryId:  string | null = null;
    let resolvedNewCategory:    { name: string } | null = null;
    let resolvedNewSubcategory: { name: string } | null = null;

    if (typeof parsed.categoryId === "string" && validCategoryIds.has(parsed.categoryId)) {
      resolvedCategoryId = parsed.categoryId;
      // Resolve subcategory
      if (typeof parsed.subcategoryId === "string" && validSubcategoryIds.has(parsed.subcategoryId)) {
        resolvedSubcategoryId = parsed.subcategoryId;
      } else if (
        parsed.newSubcategory &&
        typeof parsed.newSubcategory === "object" &&
        typeof (parsed.newSubcategory as Record<string, unknown>).name === "string"
      ) {
        resolvedNewSubcategory = {
          name: ((parsed.newSubcategory as Record<string, unknown>).name as string).slice(0, 50),
        };
      }
    } else if (
      parsed.newCategory &&
      typeof parsed.newCategory === "object" &&
      typeof (parsed.newCategory as Record<string, unknown>).name === "string"
    ) {
      resolvedNewCategory = {
        name: ((parsed.newCategory as Record<string, unknown>).name as string).slice(0, 50),
      };
    } else {
      resolvedCategoryId = fallback.categoryId;
    }

    const status = validStatuses.includes(parsed.status as Status)
      ? (parsed.status as Status)
      : "Todo";

    return {
      titleCleaned: typeof parsed.titleCleaned === "string" && parsed.titleCleaned.trim()
        ? parsed.titleCleaned.trim().slice(0, 200)
        : rawText,
      categoryId:     resolvedCategoryId,
      subcategoryId:  resolvedSubcategoryId,
      newCategory:    resolvedNewCategory,
      newSubcategory: resolvedNewSubcategory,
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
