import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const { id } = await params;

  const body = await req.json() as Record<string, unknown>;

  const allowed = ["title", "notes", "areaId", "priority", "effort", "status", "waitingOn", "dueDate"] as const;
  type AllowedKey = (typeof allowed)[number];

  const updates: Partial<Record<AllowedKey, unknown>> = {};
  for (const k of allowed) {
    if (k in body) updates[k] = body[k];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  // #5 — title length
  if (typeof updates.title === "string" && updates.title.length > 500) {
    return NextResponse.json({ error: "Title must be 500 characters or fewer" }, { status: 400 });
  }

  // #17 — validate dueDate before touching DB
  if ("dueDate" in updates && updates.dueDate) {
    if (isNaN(new Date(updates.dueDate as string).getTime())) {
      return NextResponse.json({ error: "Invalid dueDate" }, { status: 400 });
    }
    (updates as Record<string, unknown>).dueDate = new Date(updates.dueDate as string);
  } else if ("dueDate" in updates && !updates.dueDate) {
    (updates as Record<string, unknown>).dueDate = null;
  }

  // Verify ownership
  const existing = await prisma.task.findFirst({ where: { id, userId } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Handle completedAt
  if ("status" in updates) {
    (updates as Record<string, unknown>).completedAt =
      updates.status === "Done" ? new Date() : null;
  }

  const task = await prisma.task.update({
    where:   { id },
    data:    updates as Parameters<typeof prisma.task.update>[0]["data"],
    include: { area: { select: { id: true, name: true, groupName: true } } },
  });

  return NextResponse.json(task);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const { id } = await params;

  const existing = await prisma.task.findFirst({ where: { id, userId } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.task.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
