"use client";

import useSWR from "swr";
import { mutate } from "swr";
import Link from "next/link";
import type { Task } from "@/types/app";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const PRIORITY_LABEL: Record<string, string> = {
  P0: "Today", P1: "This Week", P2: "Sprint", P3: "Backlog",
};
const PRIORITY_COLOR: Record<string, string> = {
  P0: "var(--stamp-red)", P1: "var(--stamp-amber)", P2: "var(--stamp-blue)", P3: "var(--stamp-gray)",
};

function ArchiveRow({ task }: { task: Task }) {
  // #30 — check response before revalidating
  async function reopen() {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status: "Todo" }),
    });
    if (!res.ok) return;
    mutate((key: unknown) => typeof key === "string" && key.startsWith("/api/tasks"), undefined, { revalidate: true });
  }

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 group"
      style={{ borderBottom: "1px solid var(--border-light)" }}
    >
      <div style={{
        marginTop: "3px",
        width: "12px",
        height: "12px",
        flexShrink: 0,
        background: PRIORITY_COLOR[task.priority] ?? "var(--ink-ghost)",
        borderRadius: "2px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <svg width="7" height="7" viewBox="0 0 9 9" fill="none">
          <path d="M1.5 4.5l2 2 4-4" stroke="var(--paper-surface)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)",
          fontSize: "13px",
          color: "var(--ink-ghost)",
          textDecoration: "line-through",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {task.title}
        </p>
        <div className="flex gap-2 mt-1 flex-wrap">
          {task.area?.name && (
            <span style={{ fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)", fontSize: "10px", color: "var(--ink-ghost)" }}>
              {task.area.name}
            </span>
          )}
          <span style={{ fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)", fontSize: "10px", color: "var(--ink-ghost)" }}>
            {PRIORITY_LABEL[task.priority] ?? task.priority}
          </span>
          {task.completedAt && (
            <span style={{ fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)", fontSize: "10px", color: "var(--ink-ghost)" }}>
              Done {new Date(task.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>
      </div>

      <button
        onClick={reopen}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)",
          fontSize: "11px",
          color: "var(--stamp-blue)",
          cursor: "pointer",
          flexShrink: 0,
          letterSpacing: "0.04em",
        }}
      >
        Reopen
      </button>
    </div>
  );
}

export default function ArchivePage() {
  const { data: tasks = [] } = useSWR<Task[]>(
    "/api/tasks?includeArchive=true",
    fetcher,
    { refreshInterval: 10_000 }
  );

  const doneTasks = tasks.filter((t) => t.status === "Done");

  // Group by area name
  const byArea: Record<string, Task[]> = {};
  for (const t of doneTasks) {
    const key = t.area?.name ?? "Unassigned";
    if (!byArea[key]) byArea[key] = [];
    byArea[key].push(t);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper-bg)", fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)" }}>

      {/* Header */}
      <header
        className="px-6 pt-5 pb-4"
        style={{ borderBottom: "1.5px solid var(--border-ink)", background: "var(--paper-bg)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/"
              style={{ fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)", fontSize: "12px", color: "var(--stamp-blue)", letterSpacing: "0.05em" }}
            >
              ← RADAR
            </Link>
            <h1
              style={{ fontFamily: "var(--font-dm-serif)", fontSize: "22px", letterSpacing: "0.1em", color: "var(--ink)", marginTop: "4px" }}
            >
              ARCHIVE
            </h1>
          </div>
          <p style={{ fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)", fontSize: "15px", color: "var(--ink-faint)", fontStyle: "italic" }}>
            {doneTasks.length} completed
          </p>
        </div>
      </header>

      <div className="px-6 py-6 max-w-2xl">
        {doneTasks.length === 0 ? (
          <p style={{ fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)", fontSize: "15px", color: "var(--ink-ghost)", fontStyle: "italic" }}>
            Nothing archived yet. Complete some tasks!
          </p>
        ) : (
          <div className="space-y-6">
            {Object.entries(byArea).map(([areaName, areaTasks]) => (
              <div key={areaName}>
                {/* Area header */}
                <div style={{ borderLeft: "3px solid var(--border-ink)", paddingLeft: "10px", marginBottom: "0.5rem" }}>
                  <span style={{ fontFamily: "var(--font-dm-serif)", fontSize: "13px", letterSpacing: "0.06em", color: "var(--ink-faint)" }}>
                    {areaName.toUpperCase()}
                  </span>
                  <span className="stamp-chip ml-2" style={{ color: "var(--ink-ghost)", fontSize: "10px" }}>
                    {areaTasks.length}
                  </span>
                </div>

                <div style={{ background: "var(--paper-surface)", border: "1px solid var(--border-ink)", boxShadow: "2px 2px 0 rgba(0,0,0,0.05)" }}>
                  {areaTasks.map((t) => (
                    <ArchiveRow key={t.id} task={t} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
