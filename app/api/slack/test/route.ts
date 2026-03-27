import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

interface SlackChannelInfoResponse {
  ok: boolean;
  channel?: { name: string; is_private?: boolean };
  error?: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Allow passing token/channel as query params for pre-save testing,
  // otherwise fall back to what's already stored
  let token = searchParams.get("token") || "";
  let channelId = searchParams.get("channel") || "";

  if (!token || !channelId) {
    const db = getDb();
    const tokenRow = db.prepare("SELECT value FROM meta WHERE key = ?").get("slack_token") as { value: string } | undefined;
    const channelRow = db.prepare("SELECT value FROM meta WHERE key = ?").get("slack_channel_id") as { value: string } | undefined;
    token = token || tokenRow?.value || process.env.SLACK_USER_TOKEN || "";
    channelId = channelId || channelRow?.value || process.env.SLACK_CHANNEL_ID || "";
  }

  if (!token || !channelId) {
    return NextResponse.json({ ok: false, error: "No credentials provided" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://slack.com/api/conversations.info?channel=${encodeURIComponent(channelId)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = (await res.json()) as SlackChannelInfoResponse;

    if (data.ok && data.channel) {
      return NextResponse.json({ ok: true, channel_name: data.channel.name });
    }

    // Friendly error messages
    const friendly: Record<string, string> = {
      invalid_auth: "Token is invalid. Double-check you copied the full token.",
      channel_not_found: "Channel not found. Make sure the channel ID is correct (e.g. C08XXXXXXXX).",
      not_in_channel: "You're not a member of that channel. Join it in Slack first.",
      missing_scope: "Token is missing required scopes. Add channels:read and groups:read.",
    };

    return NextResponse.json({
      ok: false,
      error: friendly[data.error ?? ""] ?? data.error ?? "Unknown error",
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { token, channel_id } = await req.json();
    if (!token || !channel_id) {
      return NextResponse.json({ error: "token and channel_id required" }, { status: 400 });
    }

    const db = getDb();
    db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)").run("slack_token", token);
    db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)").run("slack_channel_id", channel_id);
    // Reset last-polled ts so next sync pulls fresh messages
    db.prepare("DELETE FROM meta WHERE key = ?").run("slack_last_ts");

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
