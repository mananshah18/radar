import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const areas = await prisma.area.findMany({
    where:   { userId },
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { tasks: { where: { status: { not: "Done" } } } } },
    },
  });

  return NextResponse.json(
    areas.map((a) => ({ ...a, taskCount: a._count.tasks }))
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json();
  const { name, groupName, isInbox } = body as {
    name?: string;
    groupName?: string;
    isInbox?: boolean;
  };

  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  // #40 — enforce name length
  if (name.trim().length > 100) {
    return NextResponse.json({ error: "Area name must be 100 characters or fewer" }, { status: 400 });
  }

  // #8/#9 — wrap free plan check + inbox unset + insert in a transaction
  let area;
  try {
    area = await prisma.$transaction(async (tx) => {
      if (session.user.plan === "free") {
        const count = await tx.area.count({ where: { userId } });
        if (count >= 7) {
          throw Object.assign(new Error("LIMIT"), { code: "AREA_LIMIT" });
        }
      }

      const maxOrder = await tx.area.aggregate({
        where: { userId },
        _max:  { sortOrder: true },
      });

      if (isInbox) {
        await tx.area.updateMany({
          where: { userId, isInbox: true },
          data:  { isInbox: false },
        });
      }

      return tx.area.create({
        data: {
          userId,
          name:      name.trim(),
          groupName: groupName?.trim() || "General",
          sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
          isInbox:   isInbox ?? false,
        },
      });
    });
  } catch (err) {
    const e = err as { code?: string; message?: string };
    if (e.code === "AREA_LIMIT") {
      return NextResponse.json(
        { error: "Free plan allows up to 7 areas. Upgrade to add more." },
        { status: 402 }
      );
    }
    throw err;
  }

  return NextResponse.json(area, { status: 201 });
}
