import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const TASK_SELECT = `
  SELECT t.*, b.slug as bucket_slug, b.name as bucket_name
  FROM tasks t
  JOIN buckets b ON b.id = t.bucket_id
`;

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const bucket = searchParams.get("bucket");       // slug or "all" or "focus"
    const includeArchive = searchParams.get("includeArchive") === "true";

    const conditions: string[] = [];
    const values: (string | number)[] = [];

    if (bucket && bucket !== "all" && bucket !== "focus" && bucket !== "waiting") {
      conditions.push("b.slug = ?");
      values.push(bucket);
    }
    if (bucket === "focus") {
      conditions.push("t.priority = 'P0'");
    }
    if (bucket === "waiting") {
      conditions.push("t.status = 'Waiting On'");
    }
    if (!includeArchive) {
      conditions.push("t.status != 'Done'");
    }

    const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";
    const tasks = db.prepare(`${TASK_SELECT} ${where} ORDER BY t.priority, t.created_at DESC`).all(...values);

    return NextResponse.json(tasks);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const { title, bucket_id, sub_area, priority, effort, notes, source, slack_ts } = body;

    if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

    // Default to Operational bucket if none provided
    const targetBucketId =
      bucket_id ??
      (db.prepare("SELECT id FROM buckets WHERE slug = 'operational'").get() as { id: number } | undefined)?.id ??
      1;

    const result = db
      .prepare(
        `INSERT INTO tasks (title, notes, bucket_id, sub_area, priority, effort, source, slack_ts)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        title,
        notes ?? null,
        targetBucketId,
        sub_area ?? null,
        priority ?? "P2",
        effort ?? "Medium",
        source ?? "manual",
        slack_ts ?? null
      );

    const task = db
      .prepare(`${TASK_SELECT} WHERE t.id = ?`)
      .get(result.lastInsertRowid);

    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
