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
  const allowed = ["name", "sortOrder", "isInbox"] as const;
  type AllowedKey = (typeof allowed)[number];

  const updates: Partial<Record<AllowedKey, unknown>> = {};
  for (const k of allowed) {
    if (k in body) updates[k] = body[k];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  if (typeof updates.name === "string" && updates.name.trim().length > 100) {
    return NextResponse.json({ error: "Category name must be 100 characters or fewer" }, { status: 400 });
  }

  const existing = await prisma.category.findFirst({ where: { id, userId } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const category = await prisma.$transaction(async (tx) => {
    if (updates.isInbox === true) {
      await tx.category.updateMany({
        where: { userId, isInbox: true, id: { not: id } },
        data:  { isInbox: false },
      });
    }
    return tx.category.update({
      where: { id, userId },
      data:  updates as Parameters<typeof prisma.category.update>[0]["data"],
    });
  });

  return NextResponse.json(category);
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

  const existing = await prisma.category.findFirst({ where: { id, userId } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Block if any tasks are assigned to this category or its subcategories
  const taskCount = await prisma.task.count({
    where: { userId, categoryId: id },
  });
  if (taskCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete category with ${taskCount} task(s). Move or delete tasks first.` },
      { status: 409 }
    );
  }

  await prisma.category.delete({ where: { id, userId } });
  return new NextResponse(null, { status: 204 });
}
