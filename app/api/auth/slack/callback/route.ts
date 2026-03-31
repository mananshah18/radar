import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createHmac } from "crypto";

interface SlackOAuthResponse {
  ok:           boolean;
  error?:       string;
  authed_user?: { access_token: string };
  team?:        { id: string; name: string };
}

// GET — Slack OAuth callback
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  const userId = session.user.id;

  const { searchParams } = new URL(req.url);
  const code  = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // User denied OAuth
  if (error === "access_denied") {
    return NextResponse.redirect(new URL("/settings?slack=denied", req.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/settings?slack=error", req.url));
  }

  // Verify CSRF state = HMAC-SHA256(userId, NEXTAUTH_SECRET)
  const secret   = process.env.NEXTAUTH_SECRET ?? "";
  const expected = createHmac("sha256", secret).update(userId).digest("hex");
  if (state !== expected) {
    return NextResponse.redirect(new URL("/settings?slack=error", req.url));
  }

  const clientId     = process.env.SLACK_CLIENT_ID     ?? "";
  const clientSecret = process.env.SLACK_CLIENT_SECRET ?? "";
  const redirectUri  = process.env.SLACK_REDIRECT_URI  ?? "";

  // Exchange code for token
  const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri }),
  });

  const data = (await tokenRes.json()) as SlackOAuthResponse;

  if (!data.ok || !data.authed_user?.access_token) {
    console.error("[slack/callback] oauth.v2.access failed:", data.error);
    return NextResponse.redirect(new URL("/settings?slack=error", req.url));
  }

  const accessToken = data.authed_user.access_token;
  const teamId      = data.team?.id ?? null;

  // Store token — reset channel so user picks a fresh one
  await prisma.userIntegration.upsert({
    where:  { userId },
    update: { slackToken: accessToken, slackTeamId: teamId, slackChannelId: null, slackLastTs: null },
    create: { userId, slackToken: accessToken, slackTeamId: teamId },
  });

  return NextResponse.redirect(new URL("/settings?slack=connected", req.url));
}
