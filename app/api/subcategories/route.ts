import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json();
  const { name, categoryId } = body as { name?: string; categoryId?: string };

  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!categoryId) {
    return NextResponse.json({ error: "categoryId is required" }, { status: 400 });
  }
  if (name.trim().length > 100) {
    return NextResponse.json({ error: "Subcategory name must be 100 characters or fewer" }, { status: 400 });
  }

  // Verify the category belongs to this user
  const category = await prisma.category.findFirst({ where: { id: categoryId, userId } });
  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  try {
    const subcategory = await prisma.subcategory.create({
      data: { userId, categoryId, name: name.trim() },
    });
    return NextResponse.json(subcategory, { status: 201 });
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
