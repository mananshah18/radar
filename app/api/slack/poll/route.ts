import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fetchUnreadMessages } from "@/lib/slack";
import { classifyTask } from "@/lib/classify";

export const maxDuration = 60;

const TASK_INCLUDE = {
  category:    { select: { id: true, name: true } },
  subcategory: { select: { id: true, name: true, categoryId: true } },
} as const;

// Called by the Vercel cron (Authorization: Bearer <CRON_SECRET>)
// or directly by the user from Settings.
export async function GET(req: NextRequest) {
  let userId: string;

  // Allow cron calls with CRON_SECRET, otherwise require user session
  const authHeader = req.headers.get("authorization");
  const isCron = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;

  if (isCron) {
    // Cron: poll for all users who have Slack configured
    const integrations = await prisma.userIntegration.findMany({
      where: { slackToken: { not: null }, slackChannelId: { not: null } },
      select: { userId: true },
    });

    let totalImported = 0;
    for (const { userId: uid } of integrations) {
      totalImported += await pollForUser(uid);
    }
    return NextResponse.json({ imported: totalImported });
  }

  // Session-based call from Settings UI
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  userId = session.user.id;

  const imported = await pollForUser(userId);
  return NextResponse.json({ imported });
}

async function pollForUser(userId: string): Promise<number> {
  let messages;
  try {
    messages = await fetchUnreadMessages(userId);
  } catch (err) {
    console.error(`[slack/poll] fetch failed for ${userId}:`, err);
    return 0;
  }

  if (messages.length === 0) return 0;

  const [categories, recentTasks] = await Promise.all([
    prisma.category.findMany({
      where:   { userId },
      orderBy: { sortOrder: "asc" },
      include: { subcategories: { select: { id: true, name: true }, orderBy: { name: "asc" } } },
    }),
    prisma.task.findMany({
      where:   { userId, status: { not: "Done" } },
      select:  { title: true, priority: true, category: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take:    30,
    }),
  ]);

  let imported = 0;

  for (const msg of messages) {
    try {
      const result = await classifyTask(msg.text, {
        categories,
        recentTasks: recentTasks.map((t) => ({
          title:        t.title,
          categoryName: t.category?.name ?? "Unassigned",
          priority:     t.priority as import("@/types/app").Priority,
        })),
      });

      let categoryId    = result.categoryId;
      let subcategoryId = result.subcategoryId;

      // Create new category if AI proposed one
      if (!categoryId && result.newCategory) {
        const maxSort = await prisma.category.aggregate({ where: { userId }, _max: { sortOrder: true } });
        const newCat  = await prisma.category.create({
          data: { userId, name: result.newCategory.name, sortOrder: (maxSort._max.sortOrder ?? 0) + 1 },
        });
        categoryId = newCat.id;
        categories.push({ ...newCat, subcategories: [] });
      }

      // Create new subcategory if AI proposed one
      if (categoryId && result.newSubcategory && !subcategoryId) {
        try {
          const newSub = await prisma.subcategory.create({
            data: { userId, categoryId, name: result.newSubcategory.name },
          });
          subcategoryId = newSub.id;
        } catch {
          const existing = await prisma.subcategory.findFirst({
            where: { categoryId, name: result.newSubcategory.name },
          });
          if (existing) subcategoryId = existing.id;
        }
      }

      // Fallback to inbox
      if (!categoryId) {
        const inbox = categories.find((c) => c.isInbox) ?? categories[0];
        categoryId = inbox?.id ?? null;
      }

      // Skip duplicate Slack messages (same ts already imported)
      const duplicate = await prisma.task.findFirst({
        where: { userId, slackTs: msg.ts },
        select: { id: true },
      });
      if (duplicate) continue;

      await prisma.task.create({
        data: {
          userId,
          title:        result.titleCleaned,
          categoryId,
          subcategoryId,
          priority:     result.priority,
          effort:       result.effort,
          status:       result.status,
          waitingOn:    result.status === "Waiting On" ? result.waitingOn : null,
          notes:        result.notes,
          source:       "slack",
          slackTs:      msg.ts,
        },
        include: TASK_INCLUDE,
      });

      imported++;
    } catch (err) {
      console.error(`[slack/poll] classify/create failed for ts=${msg.ts}:`, err);
    }
  }

  return imported;
}
