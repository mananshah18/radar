import { NextRequest, NextResponse } from "next/server";
import { classifyTask } from "@/lib/claude";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });

    const db = getDb();
    const buckets = db
      .prepare("SELECT id, name, group_name FROM buckets ORDER BY sort_order")
      .all() as { id: number; name: string; group_name: string }[];

    const result = await classifyTask(text, buckets);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
