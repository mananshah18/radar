import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const categories = await prisma.category.findMany({
    where:   { userId },
    orderBy: { sortOrder: "asc" },
    include: {
      subcategories: {
        orderBy: { name: "asc" },
        include: {
          _count: { select: { tasks: { where: { status: { not: "Done" } } } } },
        },
      },
      _count: { select: { tasks: { where: { status: { not: "Done" } } } } },
    },
  });

  return NextResponse.json(
    categories.map((c) => ({
      ...c,
      taskCount:    c._count.tasks,
      subcategories: c.subcategories.map((s) => ({ ...s, taskCount: s._count.tasks })),
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json();
  const { name, isInbox } = body as { name?: string; isInbox?: boolean };

  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (name.trim().length > 100) {
    return NextResponse.json({ error: "Category name must be 100 characters or fewer" }, { status: 400 });
  }

  let category;
  try {
    category = await prisma.$transaction(async (tx) => {
      if (session.user.plan === "free") {
        const count = await tx.category.count({ where: { userId } });
        if (count >= 7) {
          throw Object.assign(new Error("LIMIT"), { code: "CATEGORY_LIMIT" });
        }
      }

      const maxOrder = await tx.category.aggregate({
        where: { userId },
        _max:  { sortOrder: true },
      });

      if (isInbox) {
        await tx.category.updateMany({
          where: { userId, isInbox: true },
          data:  { isInbox: false },
        });
      }

      return tx.category.create({
        data: {
          userId,
          name:      name.trim(),
          sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
          isInbox:   isInbox ?? false,
        },
      });
    });
  } catch (err) {
    const e = err as { code?: string };
    if (e.code === "CATEGORY_LIMIT") {
      return NextResponse.json(
        { error: "Free plan allows up to 7 categories. Upgrade to add more." },
        { status: 402 }
      );
    }
    throw err;
  }

  return NextResponse.json(category, { status: 201 });
}
