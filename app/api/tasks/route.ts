import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { classifyTask } from "@/lib/classify";
import type { Prisma } from "@prisma/client";

const TASK_INCLUDE = {
  category:    { select: { id: true, name: true } },
  subcategory: { select: { id: true, name: true, categoryId: true } },
} as const;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const { searchParams } = new URL(req.url);
  const categoryId     = searchParams.get("category");
  const priority       = searchParams.get("priority");
  const includeArchive = searchParams.get("includeArchive") === "true";

  const where: Prisma.TaskWhereInput = { userId };
  if (categoryId && categoryId !== "all") where.categoryId = categoryId;
  if (priority)                           where.priority = priority;
  if (!includeArchive)                    where.status = { not: "Done" };

  const tasks = await prisma.task.findMany({
    where,
    include: TASK_INCLUDE,
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const body     = await req.json() as Record<string, unknown>;
  const rawTitle = ((body.rawTitle as string | undefined) ?? (body.title as string | undefined) ?? "").trim();

  if (!rawTitle) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (rawTitle.length > 500) {
    return NextResponse.json({ error: "Title must be 500 characters or fewer" }, { status: 400 });
  }
  if (body.dueDate && isNaN(new Date(body.dueDate as string).getTime())) {
    return NextResponse.json({ error: "Invalid dueDate" }, { status: 400 });
  }

  const useAI = body.classify !== false && !!process.env.APP_ANTHROPIC_KEY;
  let titleFinal    = rawTitle;
  let categoryId    = (body.categoryId    as string | null) ?? null;
  let subcategoryId = (body.subcategoryId as string | null) ?? null;
  let priority      = (body.priority as string) ?? "P2";
  let effort        = (body.effort   as string) ?? "Medium";
  let status        = (body.status   as string) ?? "Todo";
  let waitingOn     = (body.waitingOn as string | null) ?? null;
  let notes         = (body.notes    as string | null) ?? null;

  if (useAI) {
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

    const result = await classifyTask(rawTitle, {
      categories,
      recentTasks: recentTasks.map((t) => ({
        title:        t.title,
        categoryName: t.category?.name ?? "Unassigned",
        priority:     t.priority as import("@/types/app").Priority,
      })),
    });

    titleFinal = result.titleCleaned;
    priority   = result.priority;
    effort     = result.effort;
    status     = result.status;
    if (result.waitingOn) waitingOn = result.waitingOn;
    if (result.notes && !notes) notes = result.notes;

    if (!categoryId) {
      if (result.categoryId) {
        categoryId = result.categoryId;
        if (result.subcategoryId) subcategoryId = result.subcategoryId;
      } else if (result.newCategory) {
        // Check free-tier limit before auto-creating
        const catCount = await prisma.category.count({ where: { userId } });
        const atLimit  = session.user.plan === "free" && catCount >= 7;
        if (!atLimit) {
          const maxSort  = await prisma.category.aggregate({ where: { userId }, _max: { sortOrder: true } });
          const newCat   = await prisma.category.create({
            data: { userId, name: result.newCategory.name, sortOrder: (maxSort._max.sortOrder ?? 0) + 1 },
          });
          categoryId = newCat.id;
        }
      }

      // Create new subcategory under the resolved categoryId
      if (categoryId && result.newSubcategory && !subcategoryId) {
        try {
          const newSub = await prisma.subcategory.create({
            data: { userId, categoryId, name: result.newSubcategory.name },
          });
          subcategoryId = newSub.id;
        } catch {
          // Unique constraint — subcategory already exists, find it
          const existing = await prisma.subcategory.findFirst({
            where: { categoryId, name: result.newSubcategory.name },
          });
          if (existing) subcategoryId = existing.id;
        }
      }
    }
  }

  // Fallback: assign to inbox or first category
  if (!categoryId) {
    const inbox = await prisma.category.findFirst({ where: { userId, isInbox: true } });
    if (inbox) {
      categoryId = inbox.id;
    } else {
      const first = await prisma.category.findFirst({ where: { userId }, orderBy: { sortOrder: "asc" } });
      categoryId = first?.id ?? null;
    }
  }

  let task;
  try {
    task = await prisma.$transaction(async (tx) => {
      if (session.user.plan === "free") {
        const activeCount = await tx.task.count({
          where: { userId, status: { not: "Done" } },
        });
        if (activeCount >= 50) {
          throw Object.assign(new Error("LIMIT"), { code: "TASK_LIMIT" });
        }
      }
      return tx.task.create({
        data: {
          userId,
          title: titleFinal,
          categoryId,
          subcategoryId,
          priority,
          effort,
          status,
          waitingOn: status === "Waiting On" ? waitingOn : null,
          notes,
          dueDate: body.dueDate ? new Date(body.dueDate as string) : null,
          source:  (body.source as string | undefined) ?? "manual",
        },
        include: TASK_INCLUDE,
      });
    });
  } catch (err) {
    const e = err as { code?: string };
    if (e.code === "TASK_LIMIT") {
      return NextResponse.json(
        { error: "Free plan allows 50 active tasks. Complete some or upgrade to add more." },
        { status: 402 }
      );
    }
    throw err;
  }

  return NextResponse.json(task, { status: 201 });
}
