import Anthropic from "@anthropic-ai/sdk";
import type { Priority, Effort } from "./db";

// Uses APP_ANTHROPIC_KEY (not ANTHROPIC_API_KEY) to avoid conflict with the
// Claude Code VSCode extension, which zeros out ANTHROPIC_API_KEY in integrated
// terminals as a security measure.
function getClient() {
  return new Anthropic({ apiKey: process.env.APP_ANTHROPIC_KEY });
}

export interface ClassifyResult {
  title_cleaned: string;
  bucket_id: number;
  sub_area: string | null;
  priority: Priority;
  effort: Effort;
}

const FALLBACK: ClassifyResult = {
  title_cleaned: "",
  bucket_id: 9,
  sub_area: null,
  priority: "P2",
  effort: "Medium",
};

export async function classifyTask(
  text: string,
  buckets: { id: number; name: string; group_name: string }[]
): Promise<ClassifyResult> {
  const bucketList = buckets
    .map((b) => `${b.id}=${b.group_name}:${b.name}`)
    .join(", ");

  const prompt = `You are a task classifier for a product manager's personal task tracker.

BUCKETS: ${bucketList}

SUB-AREAS (only for the "New App Launch" bucket, which contains mobile app work):
- Personalization (personalization layer, recommendations, user prefs)
- Agent (mobile agent, AI features)
- UX (design, user experience, flows)

Given the task text below, respond with ONLY a JSON object. No explanation, no markdown fences.

Rules:
- "title_cleaned": rewrite as a crisp, context-rich action item in plain English. Start with a strong verb (Review, Ship, Fix, Align, Finalize, Draft, Investigate, etc.). Include the specific subject and what outcome is needed — enough that someone reading it cold knows exactly what to do and why it matters. Remove all filler ("I need to", "don't forget to", "can you", "remember to"). Keep it one line, max 100 chars.
- "bucket_id": integer, best matching bucket from the list
- "sub_area": if bucket is New App Launch, pick "Personalization"|"Agent"|"UX"|null. Otherwise always null.
- "priority": "P0" if urgent/today/critical, "P1" if this week, "P2" if this sprint, "P3" if backlog/someday
- "effort": "Quick" if under 30 min, "Medium" if 30min-2hr, "Deep" if 2hr+

Task text: "${text.replace(/"/g, "'")}"

JSON only:`;

  try {
    const message = await getClient().messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 150,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = (message.content[0] as { type: string; text: string }).text.trim();
    // Strip markdown code fences if present
    const jsonStr = raw.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(jsonStr) as ClassifyResult;

    // Validate fields
    const validPriorities: Priority[] = ["P0", "P1", "P2", "P3"];
    const validEfforts: Effort[] = ["Quick", "Medium", "Deep"];
    const validSubAreas = ["Personalization", "Agent", "UX", null];

    return {
      title_cleaned: typeof parsed.title_cleaned === "string" && parsed.title_cleaned.trim()
        ? parsed.title_cleaned.trim()
        : text,
      bucket_id: buckets.find((b) => b.id === parsed.bucket_id) ? parsed.bucket_id : 9,
      sub_area: validSubAreas.includes(parsed.sub_area) ? parsed.sub_area : null,
      priority: validPriorities.includes(parsed.priority) ? parsed.priority : "P2",
      effort: validEfforts.includes(parsed.effort) ? parsed.effort : "Medium",
    };
  } catch (err) {
    console.error("[classify] error:", err);
    return { ...FALLBACK, title_cleaned: text };
  }
}
