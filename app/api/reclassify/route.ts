import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Cron: 30 3 * * * (03:30 UTC = 9:00 AM IST)
// Vercel calls this with Authorization: Bearer <CRON_SECRET>
// Rule-based priority bumping — never downgrades:
//   due today or overdue  → P0
//   due within 7 days     → at least P1

export const maxDuration = 60;

const PRIORITY_ORDER = ["P0", "P1", "P2", "P3"];

function higherPriority(a: string, b: string): string {
  return PRIORITY_ORDER.indexOf(a) <= PRIORITY_ORDER.indexOf(b) ? a : b;
}

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET) {
    console.error("[reclassify] CRON_SECRET is not set");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const in7   = new Date(today);
  in7.setDate(in7.getDate() + 7);

  // Fetch all active tasks that have a due date
  const tasks = await prisma.task.findMany({
    where: {
      status:  { not: "Done" },
      dueDate: { not: null },
    },
    select: { id: true, priority: true, dueDate: true },
  });

  let bumped = 0;

  for (const task of tasks) {
    const due = new Date(task.dueDate!);
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());

    let targetPriority: string | null = null;

    if (dueDay <= today) {
      // Due today or overdue → P0
      targetPriority = "P0";
    } else if (dueDay <= in7) {
      // Due within 7 days → at least P1
      targetPriority = "P1";
    }

    if (!targetPriority) continue;

    // Only upgrade, never downgrade
    const newPriority = higherPriority(targetPriority, task.priority);
    if (newPriority === task.priority) continue;

    await prisma.task.update({
      where: { id: task.id },
      data:  { priority: newPriority },
    });
    bumped++;
  }

  console.log(`[reclassify] bumped ${bumped} of ${tasks.length} tasks`);
  return NextResponse.json({ checked: tasks.length, bumped });
}
