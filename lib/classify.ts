import Anthropic from "@anthropic-ai/sdk";
import type { Priority, Effort } from "@/types/app";

function getClient() {
  return new Anthropic({ apiKey: process.env.APP_ANTHROPIC_KEY });
}

export interface ClassifyResult {
  titleCleaned: string;
  areaId:       string | null;
  priority:     Priority;
  effort:       Effort;
}

export async function classifyTask(
  rawText: string,
  areas: { id: string; name: string; groupName: string }[]
): Promise<ClassifyResult> {
  const fallback: ClassifyResult = {
    titleCleaned: rawText,
    areaId:       areas.find((a) => a.name.toLowerCase().includes("inbox"))?.id ?? areas[0]?.id ?? null,
    priority:     "P2",
    effort:       "Medium",
  };

  // #33 — warn loudly if key missing so it's not silently disabled
  if (!process.env.APP_ANTHROPIC_KEY) {
    console.warn("[classify] APP_ANTHROPIC_KEY not set — AI classification disabled, using fallback defaults");
    return fallback;
  }
  if (areas.length === 0) return fallback;

  const areaList = areas.map((a) => `${a.id}=${a.groupName}:${a.name}`).join(", ");
  const safeText = rawText.replace(/</g, "&lt;").replace(/>/g, "&gt;").slice(0, 500);

  const prompt = `You are a task classifier for a personal task tracker.

AREAS: ${areaList}

Given the task text below (delimited by triple backticks), respond with ONLY a JSON object.
No explanation, no markdown code fences.

Rules:
- "titleCleaned": rewrite as a crisp action item. Start with a strong verb (Review, Ship, Fix, Align, Finalize, Draft, Investigate). Include context so someone reading cold knows what to do. Remove filler ("I need to", "don't forget to"). Max 100 chars.
- "areaId": one of the area IDs above that best matches, or null if unclear
- "priority": "P0" urgent/today, "P1" this week, "P2" this sprint, "P3" backlog
- "effort": "Quick" <30min, "Medium" 30min-2hr, "Deep" 2hr+

Task text: \`\`\`${safeText}\`\`\`

JSON only:`;

  try {
    const message = await getClient().messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages:   [{ role: "user", content: prompt }],
    });

    // #26 — bounds-check content array before accessing
    const block = message.content[0];
    if (!block || block.type !== "text") {
      throw new Error("Unexpected response format from AI");
    }

    const raw     = block.text.trim();
    const jsonStr = raw.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();

    // #25 — validate shape after parsing, don't trust cast alone
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;

    const validPriorities: Priority[] = ["P0", "P1", "P2", "P3"];
    const validEfforts: Effort[]      = ["Quick", "Medium", "Deep"];
    const validAreaIds                = new Set(areas.map((a) => a.id));

    return {
      titleCleaned: typeof parsed.titleCleaned === "string" && parsed.titleCleaned.trim()
        ? parsed.titleCleaned.trim().slice(0, 200)
        : rawText,
      // #43 — null is a valid intentional response (AI unsure → use fallback area)
      areaId: parsed.areaId === null || (typeof parsed.areaId === "string" && validAreaIds.has(parsed.areaId))
        ? (parsed.areaId as string | null)
        : fallback.areaId,
      priority: validPriorities.includes(parsed.priority as Priority)
        ? (parsed.priority as Priority)
        : "P2",
      effort: validEfforts.includes(parsed.effort as Effort)
        ? (parsed.effort as Effort)
        : "Medium",
    };
  } catch (err) {
    console.error("[classify] error:", err);
    return fallback;
  }
}
