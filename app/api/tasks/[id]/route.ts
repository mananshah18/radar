import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const TASK_SELECT = `
  SELECT t.*, b.slug as bucket_slug, b.name as bucket_name
  FROM tasks t
  JOIN buckets b ON b.id = t.bucket_id
`;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const db = getDb();

    const allowed = ["title", "notes", "bucket_id", "sub_area", "priority", "effort", "status", "waiting_on"];
    const fields = Object.keys(body).filter((k) => allowed.includes(k));
    if (fields.length === 0) {
      return NextResponse.json({ error: "No valid fields" }, { status: 400 });
    }

    // Handle completed_at automatically
    if (body.status === "Done") {
      fields.push("completed_at");
      body.completed_at = new Date().toISOString();
    } else if ("status" in body && body.status !== "Done") {
      fields.push("completed_at");
      body.completed_at = null;
    }

    const setClauses = fields.map((f) => `${f} = ?`).join(", ");
    const values = fields.map((f) => body[f] ?? null);

    db.prepare(`UPDATE tasks SET ${setClauses} WHERE id = ?`).run(...values, Number(id));
    const task = db.prepare(`${TASK_SELECT} WHERE t.id = ?`).get(Number(id));

    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(task);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    db.prepare("DELETE FROM tasks WHERE id = ?").run(Number(id));
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
