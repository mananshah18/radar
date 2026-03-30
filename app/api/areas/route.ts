import { NextResponse } from "next/server";

// Renamed to /api/categories
export async function GET() {
  return NextResponse.json({ error: "Use /api/categories" }, { status: 410 });
}
export async function POST() {
  return NextResponse.json({ error: "Use /api/categories" }, { status: 410 });
}
