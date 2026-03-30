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

  // #7 — removed "deadline" (not in schema); only allow real fields
  const allowed = ["name", "groupName", "sortOrder", "isInbox"] as const;
  type AllowedKey = (typeof allowed)[number];

  const updates: Partial<Record<AllowedKey, unknown>> = {};
  for (const k of allowed) {
    if (k in body) updates[k] = body[k];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  // #40 — name length
  if (typeof updates.name === "string" && updates.name.trim().length > 100) {
    return NextResponse.json({ error: "Area name must be 100 characters or fewer" }, { status: 400 });
  }

  const existing = await prisma.area.findFirst({ where: { id, userId } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // #9 — wrap inbox unset + update in a transaction to prevent race condition
  const area = await prisma.$transaction(async (tx) => {
    if (updates.isInbox === true) {
      await tx.area.updateMany({
        where: { userId, isInbox: true, id: { not: id } },
        data:  { isInbox: false },
      });
    }
    return tx.area.update({
      where: { id },
      data:  updates as Parameters<typeof prisma.area.update>[0]["data"],
    });
  });

  return NextResponse.json(area);
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

  const existing = await prisma.area.findFirst({ where: { id, userId } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const taskCount = await prisma.task.count({ where: { areaId: id, userId } });
  if (taskCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete area with ${taskCount} task(s). Move or delete tasks first.` },
      { status: 409 }
    );
  }

  await prisma.area.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
