import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();
    const buckets = db
      .prepare(
        `SELECT b.*,
          COUNT(CASE WHEN t.status != 'Done' THEN 1 END) as task_count
        FROM buckets b
        LEFT JOIN tasks t ON t.bucket_id = b.id
        GROUP BY b.id
        ORDER BY b.sort_order`
      )
      .all();
    return NextResponse.json(buckets);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, group_name, deadline } = await req.json();
    if (!name || !group_name) {
      return NextResponse.json({ error: "name and group_name required" }, { status: 400 });
    }

    const db = getDb();
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const maxOrder = (
      db.prepare("SELECT COALESCE(MAX(sort_order), 0) as m FROM buckets").get() as { m: number }
    ).m;

    const result = db
      .prepare(
        "INSERT INTO buckets (slug, name, group_name, sort_order, deadline) VALUES (?, ?, ?, ?, ?)"
      )
      .run(slug, name, group_name, maxOrder + 1, deadline ?? null);

    const bucket = db.prepare("SELECT * FROM buckets WHERE id = ?").get(result.lastInsertRowid);
    return NextResponse.json(bucket, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
