import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

// Cron: 0 14 * * 1 (14:00 UTC Monday = 9 AM EST)
// Vercel calls this with Authorization: Bearer <CRON_SECRET>

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // #4 — guard against undefined CRON_SECRET making comparison always pass
  if (!process.env.CRON_SECRET) {
    console.error("[digest] CRON_SECRET is not set — refusing all requests");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // #32 — require NEXTAUTH_URL, don't silently fall back to production URL
  const appUrl = process.env.NEXTAUTH_URL;
  if (!appUrl) {
    console.error("[digest] NEXTAUTH_URL is not set — cannot send digest links");
    return NextResponse.json({ error: "NEXTAUTH_URL not configured" }, { status: 500 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const FROM   = process.env.DIGEST_FROM_EMAIL ?? "digest@radar.app";

  const users = await prisma.user.findMany({
    where:  { digestEnabled: true, email: { not: "" } },
    select: { id: true, email: true, name: true },
  });

  let sent = 0;
  let errors = 0;

  for (const user of users) {
    try {
      const [p0Tasks, p1Tasks, tasksByArea] = await Promise.all([
        prisma.task.findMany({
          where:   { userId: user.id, status: { not: "Done" }, priority: "P0" },
          select:  { title: true },
          orderBy: { createdAt: "asc" },
          take:    10,
        }),
        prisma.task.findMany({
          where:   { userId: user.id, status: { not: "Done" }, priority: "P1" },
          select:  { title: true },
          orderBy: { createdAt: "asc" },
          take:    10,
        }),
        prisma.task.groupBy({
          by:     ["areaId"],
          where:  { userId: user.id, status: { not: "Done" } },
          _count: { id: true },
        }),
      ]);

      if (p0Tasks.length === 0 && p1Tasks.length === 0) continue;

      const areaIds   = tasksByArea.map((t) => t.areaId).filter(Boolean) as string[];
      const areaNames = await prisma.area.findMany({
        where:  { id: { in: areaIds }, userId: user.id },
        select: { id: true, name: true },
      });
      const areaMap = Object.fromEntries(areaNames.map((a) => [a.id, a.name]));

      const greeting = user.name ? `Hi ${user.name.split(" ")[0]},` : "Hi,";
      const p0Lines  = p0Tasks.map((t) => `  • ${t.title}`).join("\n");
      const p1Lines  = p1Tasks.map((t) => `  • ${t.title}`).join("\n");
      const areaLines = tasksByArea
        .map((t) => `  ${t.areaId ? (areaMap[t.areaId] ?? "Unknown") : "Unassigned"}: ${t._count.id}`)
        .join("\n");

      const body = [
        greeting,
        "",
        "Here's your weekly task summary:",
        "",
        p0Tasks.length > 0 ? `TODAY (P0) — ${p0Tasks.length} open:\n${p0Lines}` : null,
        p1Tasks.length > 0 ? `THIS WEEK (P1) — ${p1Tasks.length} open:\n${p1Lines}` : null,
        areaLines         ? `\nTasks by area:\n${areaLines}` : null,
        "",
        `Open your board: ${appUrl}`,
        "",
        "— Radar",
        "",
        'Unsubscribe: reply with "unsubscribe"',
      ]
        .filter((l) => l !== null)
        .join("\n");

      await resend.emails.send({
        from:    FROM,
        to:      user.email,
        subject: `Radar: ${p0Tasks.length} urgent, ${p1Tasks.length} this week`,
        text:    body,
      });

      await prisma.digestLog.create({
        data: {
          userId:    user.id,
          taskCount: p0Tasks.length + p1Tasks.length,
          openP0:    p0Tasks.length,
          openP1:    p1Tasks.length,
        },
      });

      sent++;
    } catch (err) {
      console.error(`[digest] failed for ${user.email}:`, err);
      errors++;
    }
  }

  return NextResponse.json({ sent, errors, users: users.length });
}
