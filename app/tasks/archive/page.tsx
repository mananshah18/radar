"use client";

import useSWR from "swr";
import Link from "next/link";
import type { Task } from "@/lib/db";
import { TaskRow } from "@/components/tasks/TaskRow";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ArchivePage() {
  const { data: tasks = [] } = useSWR<Task[]>(
    "/api/tasks?bucket=all&includeArchive=true",
    fetcher,
    { refreshInterval: 10000 }
  );

  const doneTasks = tasks.filter((t) => t.status === "Done");

  // Group by bucket
  const byBucket: Record<string, Task[]> = {};
  for (const t of doneTasks) {
    const key = t.bucket_name ?? "General";
    if (!byBucket[key]) byBucket[key] = [];
    byBucket[key].push(t);
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--page-bg)" }}>
      {/* Sidebar */}
      <aside
        className="flex-shrink-0 flex flex-col h-screen"
        style={{
          width: "var(--sidebar-w)",
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "saturate(180%) blur(20px)",
          WebkitBackdropFilter: "saturate(180%) blur(20px)",
          borderRight: "1px solid var(--border)",
        }}
      >
        <div className="px-5 pt-6 pb-4">
          <Link
            href="/"
            className="text-[13px] flex items-center gap-1.5 mb-4"
            style={{ color: "var(--accent)" }}
          >
            ← Back
          </Link>
          <h1 className="font-semibold text-[17px] tracking-tight" style={{ color: "var(--text-primary)" }}>
            Archive
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            {doneTasks.length} completed
          </p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div
          className="flex items-center px-8 py-3 flex-shrink-0"
          style={{
            background: "rgba(245,245,247,0.85)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            Completed Tasks
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
          {Object.entries(byBucket).map(([bucketName, bTasks]) => (
            <div
              key={bucketName}
              className="rounded-2xl overflow-hidden"
              style={{
                background: "var(--surface)",
                boxShadow: "var(--shadow-sm)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                className="px-5 py-3 flex items-center gap-2"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <h2 className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
                  {bucketName}
                </h2>
                <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                  {bTasks.length}
                </span>
              </div>
              {bTasks.map((t, i) => (
                <TaskRow key={t.id} task={t} showBucket={false} isLast={i === bTasks.length - 1} />
              ))}
            </div>
          ))}

          {doneTasks.length === 0 && (
            <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>
              No completed tasks yet.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
