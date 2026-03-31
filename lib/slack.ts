import { prisma } from "@/lib/prisma";

export interface SlackMessage {
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

interface SlackChannelInfoResponse {
  ok: boolean;
  channel?: { name: string; is_private?: boolean };
  error?: string;
}

export async function getSlackCredentials(userId: string) {
  const integration = await prisma.userIntegration.findUnique({
    where: { userId },
    select: { slackToken: true, slackChannelId: true, slackLastTs: true },
  });

  if (!integration?.slackToken || !integration?.slackChannelId) return null;

  return {
    token:     integration.slackToken,
    channelId: integration.slackChannelId,
    lastTs:    integration.slackLastTs,
  };
}

export async function fetchUnreadMessages(userId: string): Promise<SlackMessage[]> {
  const creds = await getSlackCredentials(userId);
  if (!creds) {
    throw new Error("Slack credentials not configured. Go to Settings → Slack Integration to set up.");
  }

  const { token, channelId, lastTs } = creds;
  const oldest = lastTs ?? String(Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 7);

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
    await prisma.userIntegration.update({
      where: { userId },
      data:  { slackLastTs: newest },
    });
  }

  return messages;
}

export async function testSlackConnection(
  token: string,
  channelId: string
): Promise<{ ok: true; channelName: string } | { ok: false; error: string }> {
  const FRIENDLY: Record<string, string> = {
    invalid_auth:    "Token is invalid. Double-check you copied the full token.",
    channel_not_found: "Channel not found. Make sure the channel ID is correct (e.g. C08XXXXXXXX).",
    not_in_channel:  "You're not a member of that channel. Join it in Slack first.",
    missing_scope:   "Token is missing required scopes. Add channels:history and channels:read.",
  };

  try {
    const res = await fetch(
      `https://slack.com/api/conversations.info?channel=${encodeURIComponent(channelId)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = (await res.json()) as SlackChannelInfoResponse;

    if (data.ok && data.channel) {
      return { ok: true, channelName: data.channel.name };
    }

    return {
      ok:    false,
      error: FRIENDLY[data.error ?? ""] ?? data.error ?? "Unknown error",
    };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
