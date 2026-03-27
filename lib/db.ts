import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "tasks.db");
const SCHEMA_PATH = path.join(process.cwd(), "lib", "schema.sql");

// Singleton — reuse the same connection across hot reloads in dev
declare global {
  // eslint-disable-next-line no-var
  var __db: Database.Database | undefined;
}

function createDb(): Database.Database {
  const db = new Database(DB_PATH);
  const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
  // Execute each statement separately (better-sqlite3 doesn't support multi-statement exec via .exec on some versions)
  db.exec(schema);
  seedBuckets(db);
  return db;
}

function seedBuckets(db: Database.Database) {
  const count = (db.prepare("SELECT COUNT(*) as c FROM buckets").get() as { c: number }).c;
  if (count > 0) return;

  const insert = db.prepare(`
    INSERT INTO buckets (slug, name, group_name, sort_order, deadline) VALUES (?, ?, ?, ?, ?)
  `);

  const seedMany = db.transaction(() => {
    insert.run("mobile-new-app-launch", "New App Launch", "Mobile", 1, "2026-05-11");
    insert.run("mobile-spotter-3",      "Spotter 3",       "Mobile", 2, null);
    insert.run("mobile-pivots",         "Pivots",          "Mobile", 3, null);
    insert.run("mobile-existing",       "Existing",        "Mobile", 4, null);
    insert.run("charts-ai-agents",      "AI Agents",       "Charts", 5, null);
    insert.run("charts-muze-launch",    "Muze Launch",     "Charts", 6, null);
    insert.run("charts-operations",     "Operations",      "Charts", 7, null);
    insert.run("strategy-brainstorm",   "Strategy & Brainstorm", "General", 8, null);
    insert.run("operational",           "Operational",     "General", 9, null);
  });

  seedMany();
}

export function getDb(): Database.Database {
  if (process.env.NODE_ENV === "production") {
    return createDb();
  }
  if (!global.__db) {
    global.__db = createDb();
  }
  return global.__db;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type Priority = "P0" | "P1" | "P2" | "P3";
export type Effort   = "Quick" | "Medium" | "Deep";
export type Status   = "Todo" | "In Progress" | "Waiting On" | "Done";
export type Source   = "manual" | "slack";
export type SubArea  = "Personalization" | "Agent" | "UX";

export interface Bucket {
  id: number;
  slug: string;
  name: string;
  group_name: string;
  sort_order: number;
  deadline: string | null;
  created_at: string;
  task_count?: number;
}

export interface Task {
  id: number;
  title: string;
  notes: string | null;
  bucket_id: number;
  bucket_slug?: string;
  bucket_name?: string;
  sub_area: string | null;
  priority: Priority;
  effort: Effort;
  status: Status;
  waiting_on: string | null;
  source: Source;
  slack_ts: string | null;
  created_at: string;
  completed_at: string | null;
}
