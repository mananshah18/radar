import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createHmac } from "crypto";

// GET — initiate Slack OAuth flow
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId     = process.env.SLACK_CLIENT_ID;
  const redirectUri  = process.env.SLACK_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: "Slack OAuth not configured" }, { status: 500 });
  }

  // CSRF state = HMAC-SHA256(userId, NEXTAUTH_SECRET)
  const secret = process.env.NEXTAUTH_SECRET ?? "";
  const state  = createHmac("sha256", secret).update(session.user.id).digest("hex");

  const url = new URL("https://slack.com/oauth/v2/authorize");
  url.searchParams.set("client_id",    clientId);
  url.searchParams.set("user_scope",   "channels:history,channels:read");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state",        state);

  return NextResponse.redirect(url.toString());
}
