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

  const body = await req.json() as { name?: string };
  const name = body.name?.trim();

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (name.length > 100) {
    return NextResponse.json({ error: "Subcategory name must be 100 characters or fewer" }, { status: 400 });
  }

  const existing = await prisma.subcategory.findFirst({ where: { id, userId } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const subcategory = await prisma.subcategory.update({
      where: { id, userId },
      data:  { name },
    });
    return NextResponse.json(subcategory);
  } catch (err) {
    const e = err as { code?: string };
    if (e.code === "P2002") {
      return NextResponse.json(
        { error: "A subcategory with that name already exists in this category." },
        { status: 409 }
      );
    }
    throw err;
  }
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

  const existing = await prisma.subcategory.findFirst({ where: { id, userId } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const taskCount = await prisma.task.count({ where: { userId, subcategoryId: id } });
  if (taskCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete subcategory with ${taskCount} task(s). Move or delete tasks first.` },
      { status: 409 }
    );
  }

  await prisma.subcategory.delete({ where: { id, userId } });
  return new NextResponse(null, { status: 204 });
}
