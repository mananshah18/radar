/**
 * One-time migration: tasks.db (old SQLite) → radar.db (Prisma/NextAuth)
 *
 * Usage:
 *   1. Sign up at http://localhost:3000/signup
 *   2. Find your user id: DATABASE_URL="file:./radar.db" npx prisma studio
 *   3. Run: USER_ID=<your-id> npx tsx scripts/migrate-to-radar.ts
 */

import Database from "better-sqlite3";
import path from "path";
import { PrismaClient } from "@prisma/client";

const userId = process.env.USER_ID;
if (!userId) {
  console.error("Error: USER_ID env var is required.");
  console.error("  USER_ID=clxxxxx npx tsx scripts/migrate-to-radar.ts");
  process.exit(1);
}

const oldDb = new Database(path.join(process.cwd(), "tasks.db"), { readonly: true });
const prisma = new PrismaClient({ datasources: { db: { url: "file:./radar.db" } } });

interface OldBucket {
  id: number;
  slug: string;
  name: string;
  group_name: string;
  sort_order: number;
  deadline: string | null;
}

interface OldTask {
  id: number;
  title: string;
  notes: string | null;
  bucket_id: number;
  sub_area: string | null;
  priority: string;
  effort: string;
  status: string;
  waiting_on: string | null;
  source: string;
  slack_ts: string | null;
  created_at: string;
  completed_at: string | null;
}

async function run() {
  console.log(`Migrating data for user: ${userId}`);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    console.error(`User ${userId} not found in radar.db. Sign up first.`);
    process.exit(1);
  }
  console.log(`Found user: ${user.email}`);

  // 1. Migrate buckets → areas
  const oldBuckets = oldDb.prepare("SELECT * FROM buckets ORDER BY sort_order").all() as OldBucket[];
  console.log(`\nMigrating ${oldBuckets.length} buckets → areas…`);

  const bucketToAreaId = new Map<number, string>();

  for (const b of oldBuckets) {
    // Check if area with same name already exists for this user
    const existing = await prisma.area.findFirst({
      where: { userId: userId!, name: b.name },
    });
    if (existing) {
      console.log(`  ↳ Area "${b.name}" already exists, skipping.`);
      bucketToAreaId.set(b.id, existing.id);
      continue;
    }

    const area = await prisma.area.create({
      data: {
        userId:    userId!,
        name:      b.name,
        groupName: b.group_name,
        sortOrder: b.sort_order,
        isInbox:   b.slug === "operational",
      },
    });
    bucketToAreaId.set(b.id, area.id);
    console.log(`  ✓ ${b.group_name}: ${b.name} → ${area.id}`);
  }

  // 2. Migrate tasks
  const oldTasks = oldDb.prepare("SELECT * FROM tasks ORDER BY created_at").all() as OldTask[];
  console.log(`\nMigrating ${oldTasks.length} tasks…`);

  const BATCH_SIZE = 100;
  let count = 0;

  for (let i = 0; i < oldTasks.length; i += BATCH_SIZE) {
    const batch = oldTasks.slice(i, i + BATCH_SIZE);
    await prisma.task.createMany({
      data: batch.map((t) => ({
        userId:      userId!,
        areaId:      bucketToAreaId.get(t.bucket_id) ?? null,
        title:       t.title,
        notes:       t.notes ?? null,
        priority:    ["P0", "P1", "P2", "P3"].includes(t.priority) ? t.priority : "P2",
        effort:      ["Quick", "Medium", "Deep"].includes(t.effort) ? t.effort : "Medium",
        status:      ["Todo", "In Progress", "Waiting On", "Done"].includes(t.status)
          ? t.status
          : "Todo",
        waitingOn:   t.waiting_on ?? null,
        source:      t.source ?? "manual",
        createdAt:   new Date(t.created_at),
        completedAt: t.completed_at ? new Date(t.completed_at) : null,
      })),
    });
    count += batch.length;
    console.log(`  ✓ ${count}/${oldTasks.length} tasks migrated`);
  }

  console.log(`\n✅ Migration complete!`);
  console.log(`   ${oldBuckets.length} areas, ${oldTasks.length} tasks migrated for ${user.email}`);

  await prisma.$disconnect();
  oldDb.close();
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
