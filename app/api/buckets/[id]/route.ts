import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const db = getDb();

    const allowed = ["name", "group_name", "deadline", "sort_order"];
    const fields = Object.keys(body).filter((k) => allowed.includes(k));
    if (fields.length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const setClauses = fields.map((f) => `${f} = ?`).join(", ");
    const values = fields.map((f) => body[f]);

    db.prepare(`UPDATE buckets SET ${setClauses} WHERE id = ?`).run(...values, Number(id));
    const bucket = db.prepare("SELECT * FROM buckets WHERE id = ?").get(Number(id));

    if (!bucket) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(bucket);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();

    const taskCount = (
      db
        .prepare("SELECT COUNT(*) as c FROM tasks WHERE bucket_id = ?")
        .get(Number(id)) as { c: number }
    ).c;

    if (taskCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete bucket with ${taskCount} task(s). Move or delete tasks first.` },
        { status: 409 }
      );
    }

    db.prepare("DELETE FROM buckets WHERE id = ?").run(Number(id));
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
