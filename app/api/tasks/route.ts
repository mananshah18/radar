import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { classifyTask } from "@/lib/classify";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const { searchParams } = new URL(req.url);
  const areaId         = searchParams.get("area");
  const priority       = searchParams.get("priority");
  const includeArchive = searchParams.get("includeArchive") === "true";

  // #23 — typed where instead of `any`
  const where: Prisma.TaskWhereInput = { userId };
  if (areaId && areaId !== "all") where.areaId = areaId;
  if (priority)                    where.priority = priority;
  if (!includeArchive)             where.status = { not: "Done" };

  const tasks = await prisma.task.findMany({
    where,
    include: { area: { select: { id: true, name: true, groupName: true } } },
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
  // #5 — enforce title length
  if (rawTitle.length > 500) {
    return NextResponse.json({ error: "Title must be 500 characters or fewer" }, { status: 400 });
  }

  // #15 — validate dueDate before touching DB
  if (body.dueDate && isNaN(new Date(body.dueDate as string).getTime())) {
    return NextResponse.json({ error: "Invalid dueDate" }, { status: 400 });
  }

  // #8 — run limit check + insert in a transaction to prevent race condition
  // AI classification happens outside the transaction (network call — can't hold a SQLite lock)
  const useAI = body.classify !== false && !!process.env.APP_ANTHROPIC_KEY;
  let titleFinal = rawTitle;
  let areaId     = (body.areaId as string | null) ?? null;
  let priority   = (body.priority as string) ?? "P2";
  let effort     = (body.effort   as string) ?? "Medium";
  let status     = (body.status   as string) ?? "Todo";
  let waitingOn  = (body.waitingOn as string | null) ?? null;
  let notes      = (body.notes    as string | null) ?? null;

  if (useAI) {
    const [areas, recentTasks] = await Promise.all([
      prisma.area.findMany({
        where:   { userId },
        select:  { id: true, name: true, groupName: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.task.findMany({
        where:   { userId, status: { not: "Done" } },
        select:  { title: true, priority: true, area: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take:    30,
      }),
    ]);

    const result = await classifyTask(rawTitle, {
      areas,
      recentTasks: recentTasks.map((t) => ({
        title:    t.title,
        areaName: t.area?.name ?? "Unassigned",
        priority: t.priority as import("@/types/app").Priority,
      })),
    });

    titleFinal = result.titleCleaned;
    priority   = result.priority;
    effort     = result.effort;
    status     = result.status;
    if (result.waitingOn) waitingOn = result.waitingOn;
    if (result.notes && !notes)    notes = result.notes;

    // Handle new area creation before assigning areaId
    if (!areaId) {
      if (result.areaId) {
        areaId = result.areaId;
      } else if (result.newArea) {
        // Check free-tier limit before creating area on the fly
        const areaCount = await prisma.area.count({ where: { userId } });
        const atLimit = session.user.plan === "free" && areaCount >= 7;
        if (!atLimit) {
          const maxSort = await prisma.area.aggregate({ where: { userId }, _max: { sortOrder: true } });
          const newArea = await prisma.area.create({
            data: {
              userId,
              name:      result.newArea.name,
              groupName: result.newArea.groupName,
              sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
              isInbox:   false,
            },
          });
          areaId = newArea.id;
        }
      }
    }
  }

  // #10 — fallback: inbox → first area (not just null)
  if (!areaId) {
    const inbox = await prisma.area.findFirst({ where: { userId, isInbox: true } });
    if (inbox) {
      areaId = inbox.id;
    } else {
      const first = await prisma.area.findFirst({ where: { userId }, orderBy: { sortOrder: "asc" } });
      areaId = first?.id ?? null;
    }
  }

  // Atomic: recheck count and insert together
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
          title:     titleFinal,
          areaId,
          priority,
          effort,
          status,
          waitingOn: status === "Waiting On" ? waitingOn : null,
          notes,
          dueDate: body.dueDate ? new Date(body.dueDate as string) : null,
          source:  (body.source as string | undefined) ?? "manual",
        },
        include: { area: { select: { id: true, name: true, groupName: true } } },
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
