import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { testSlackConnection } from "@/lib/slack";

// GET — check current connection status
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const integration = await prisma.userIntegration.findUnique({
    where:  { userId },
    select: { slackToken: true, slackChannelId: true },
  });

  if (!integration?.slackToken) {
    return NextResponse.json({ ok: false });
  }

  // Connected but no channel selected yet
  if (!integration.slackChannelId) {
    return NextResponse.json({ ok: true, channelName: null });
  }

  const result = await testSlackConnection(integration.slackToken, integration.slackChannelId);
  return NextResponse.json(result);
}

// POST — save selected channel (token already stored from OAuth)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const body      = await req.json() as { channel_id?: string };
  const channelId = body.channel_id?.trim();

  if (!channelId) {
    return NextResponse.json({ error: "channel_id required" }, { status: 400 });
  }

  const integration = await prisma.userIntegration.findUnique({
    where:  { userId },
    select: { slackToken: true },
  });

  if (!integration?.slackToken) {
    return NextResponse.json({ error: "Not connected to Slack. Please connect first." }, { status: 400 });
  }

  // Test channel access before saving
  const testResult = await testSlackConnection(integration.slackToken, channelId);
  if (!testResult.ok) {
    return NextResponse.json(testResult, { status: 400 });
  }

  await prisma.userIntegration.update({
    where: { userId },
    data:  { slackChannelId: channelId, slackLastTs: null },
  });

  return NextResponse.json({ ok: true, channelName: testResult.channelName });
}

// DELETE — disconnect: revoke token server-side, then clear DB
export async function DELETE(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const integration = await prisma.userIntegration.findUnique({
    where:  { userId },
    select: { slackToken: true },
  });

  // Revoke the token server-side so it can't be reused
  if (integration?.slackToken) {
    try {
      await fetch("https://slack.com/api/auth.revoke", {
        method:  "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body:    new URLSearchParams({ token: integration.slackToken }),
      });
    } catch (err) {
      // Don't block disconnect if revoke fails
      console.error("[slack/test] auth.revoke failed:", err);
    }
  }

  await prisma.userIntegration.upsert({
    where:  { userId },
    update: { slackToken: null, slackTeamId: null, slackChannelId: null, slackLastTs: null },
    create: { userId },
  });

  return NextResponse.json({ ok: true });
}
