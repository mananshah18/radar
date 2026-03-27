import { NextResponse } from "next/server";
import { fetchUnreadMessages } from "@/lib/slack";
import { classifyTask } from "@/lib/claude";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();
    const buckets = db
      .prepare("SELECT id, name, group_name FROM buckets ORDER BY sort_order")
      .all() as { id: number; name: string; group_name: string }[];

    const messages = await fetchUnreadMessages();
    if (messages.length === 0) {
      return NextResponse.json({ imported: 0, message: "No new messages" });
    }

    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO tasks (title, bucket_id, sub_area, priority, effort, source, slack_ts)
      VALUES (?, ?, ?, ?, ?, 'slack', ?)
    `);

    let imported = 0;
    const errors: string[] = [];

    for (const msg of messages) {
      try {
        const classification = await classifyTask(msg.text, buckets);
        const result = insertStmt.run(
          classification.title_cleaned || msg.text,
          classification.bucket_id,
          classification.sub_area,
          classification.priority,
          classification.effort,
          msg.ts
        );
        if ((result.changes as number) > 0) imported++;
      } catch (e) {
        errors.push(`ts=${msg.ts}: ${String(e)}`);
      }
    }

    return NextResponse.json({ imported, total: messages.length, errors });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
