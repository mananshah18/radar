import { NextResponse } from "next/server";

// Renamed to /api/categories/[id]
export async function PATCH() {
  return NextResponse.json({ error: "Use /api/categories/[id]" }, { status: 410 });
}
export async function DELETE() {
  return NextResponse.json({ error: "Use /api/categories/[id]" }, { status: 410 });
}
