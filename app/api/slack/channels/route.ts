import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface SlackChannel {
  id:   string;
  name: string;
}

interface SlackChannelsResponse {
  ok:       boolean;
  channels?: SlackChannel[];
  error?:   string;
}

// GET — list the user's Slack channels (only channels they're a member of)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const integration = await prisma.userIntegration.findUnique({
    where:  { userId: session.user.id },
    select: { slackToken: true },
  });

  if (!integration?.slackToken) {
    return NextResponse.json({ error: "Not connected to Slack" }, { status: 400 });
  }

  const url = new URL("https://slack.com/api/conversations.list");
  url.searchParams.set("types",            "public_channel,private_channel");
  url.searchParams.set("exclude_archived", "true");
  url.searchParams.set("limit",            "200");

  const res  = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${integration.slackToken}` },
  });
  const data = (await res.json()) as SlackChannelsResponse;

  if (!data.ok) {
    return NextResponse.json({ error: data.error ?? "Failed to fetch channels" }, { status: 400 });
  }

  const channels = (data.channels ?? [])
    .map((c) => ({ id: c.id, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ channels });
}
