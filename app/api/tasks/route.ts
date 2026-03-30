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

  if (useAI) {
    const areas = await prisma.area.findMany({
      where:   { userId },
      select:  { id: true, name: true, groupName: true },
      orderBy: { sortOrder: "asc" },
    });
    if (areas.length >= 2) {
      const result = await classifyTask(rawTitle, areas);
      titleFinal = result.titleCleaned;
      if (!areaId) areaId = result.areaId;
      priority = result.priority;
      effort   = result.effort;
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
          title:   titleFinal,
          areaId,
          priority,
          effort,
          notes:   (body.notes  as string | undefined) ?? null,
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
