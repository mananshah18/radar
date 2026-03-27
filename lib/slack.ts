import { getDb } from "./db";

interface SlackMessage {
  ts: string;
  text: string;
  user?: string;
  subtype?: string;
}

interface SlackHistoryResponse {
  ok: boolean;
  messages?: SlackMessage[];
  error?: string;
}

/** Read credentials from meta table first, fall back to env vars */
export function getSlackCredentials(): { token: string; channelId: string } | null {
  const db = getDb();
  const tokenRow = db.prepare("SELECT value FROM meta WHERE key = ?").get("slack_token") as { value: string } | undefined;
  const channelRow = db.prepare("SELECT value FROM meta WHERE key = ?").get("slack_channel_id") as { value: string } | undefined;

  const token = tokenRow?.value || process.env.SLACK_USER_TOKEN || "";
  const channelId = channelRow?.value || process.env.SLACK_CHANNEL_ID || "";

  if (!token || !channelId) return null;
  return { token, channelId };
}

export async function fetchUnreadMessages(): Promise<SlackMessage[]> {
  const creds = getSlackCredentials();
  if (!creds) {
    throw new Error("Slack credentials not configured. Go to Settings → Slack Integration to set up.");
  }

  const { token, channelId } = creds;
  const db = getDb();

  const meta = db.prepare("SELECT value FROM meta WHERE key = ?").get("slack_last_ts") as
    | { value: string }
    | undefined;
  const oldest = meta?.value ?? String(Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 7);

  const url = new URL("https://slack.com/api/conversations.history");
  url.searchParams.set("channel", channelId);
  url.searchParams.set("oldest", oldest);
  url.searchParams.set("limit", "50");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = (await res.json()) as SlackHistoryResponse;

  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error}`);
  }

  const messages = (data.messages ?? [])
    .filter((m) => !m.subtype && m.text && m.text.trim())
    .reverse();

  if (messages.length > 0) {
    const newest = messages[messages.length - 1].ts;
    db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)").run("slack_last_ts", newest);
  }

  return messages;
}
