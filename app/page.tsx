"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import type { Bucket, Task } from "@/lib/db";
import { QuickCapture } from "@/components/tasks/QuickCapture";
import { BoardCard } from "@/components/tasks/BoardCard";
import { CountdownChip } from "@/components/buckets/CountdownChip";
import { mutate } from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const PRIORITY_COLS = [
  {
    key: "P0",
    label: "Today",
    sub: "Drop everything",
    color: "var(--red)",
    colorLight: "rgba(255,59,48,0.12)",
  },
  {
    key: "P1",
    label: "This Week",
    sub: "Ship by Friday",
    color: "var(--orange)",
    colorLight: "rgba(255,149,0,0.12)",
  },
  {
    key: "P2",
    label: "Sprint",
    sub: "In the plan",
    color: "var(--accent)",
    colorLight: "rgba(0,113,227,0.12)",
  },
  {
    key: "P3",
    label: "Backlog",
    sub: "Someday",
    color: "var(--text-tertiary)",
    colorLight: "rgba(0,0,0,0.05)",
  },
];

export default function HomePage() {
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [showArchive, setShowArchive] = useState(false);

  const { data: buckets = [] } = useSWR<Bucket[]>("/api/buckets", fetcher, { refreshInterval: 8000 });
  const { data: allTasks = [] } = useSWR<Task[]>(
    `/api/tasks?bucket=all${showArchive ? "&includeArchive=true" : ""}`,
    fetcher,
    { refreshInterval: 5000 }
  );

  const activeTasks = allTasks.filter((t) => t.status !== "Done");
  const totalActive = activeTasks.length;
  const waitingCount = activeTasks.filter((t) => t.status === "Waiting On").length;

  // Group by priority
  const byPriority: Record<string, Task[]> = { P0: [], P1: [], P2: [], P3: [] };
  for (const t of activeTasks) {
    if (byPriority[t.priority]) byPriority[t.priority].push(t);
  }

  // Done tasks per column (for archive view)
  const doneByPriority: Record<string, Task[]> = { P0: [], P1: [], P2: [], P3: [] };
  if (showArchive) {
    for (const t of allTasks.filter((t) => t.status === "Done")) {
      if (doneByPriority[t.priority]) doneByPriority[t.priority].push(t);
    }
  }

  async function syncSlack() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/slack/poll");
      const data = await res.json();
      setSyncMsg(data.error ? `Error: ${data.error}` : `+${data.imported} from Slack`);
      mutate((key: string) => typeof key === "string" && key.startsWith("/api/"), undefined, { revalidate: true });
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(null), 3000);
    }
  }

  const dateStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "var(--page-bg)" }}>

      {/* ── Dark Header ────────────────────────────────────── */}
      <header className="flex-shrink-0" style={{ background: "var(--header-bg)" }}>
        <div className="px-6 pt-5 pb-4 flex items-start justify-between">

          {/* Left: title + meta */}
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-white">
              My Tasks
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[12px]" style={{ color: "rgba(255,255,255,0.45)" }}>
                {dateStr}
              </span>
              <span className="w-px h-3" style={{ background: "rgba(255,255,255,0.15)" }} />
              <span className="text-[12px]" style={{ color: "rgba(255,255,255,0.45)" }}>
                {totalActive} active
                {waitingCount > 0 && ` · ${waitingCount} waiting`}
              </span>
              {syncMsg && (
                <>
                  <span className="w-px h-3" style={{ background: "rgba(255,255,255,0.15)" }} />
                  <span className="text-[12px]" style={{ color: "rgba(52,199,89,0.9)" }}>{syncMsg}</span>
                </>
              )}
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 mt-0.5">
            <button
              onClick={() => setShowArchive((p) => !p)}
              className="header-btn"
              style={showArchive ? { background: "rgba(255,255,255,0.15)", color: "white" } : {}}
            >
              {showArchive ? "Hide done" : "Show done"}
            </button>
            <button
              onClick={syncSlack}
              disabled={syncing}
              className="header-btn disabled:opacity-40"
            >
              {syncing ? "Syncing…" : "Sync Slack"}
            </button>
            <Link href="/tasks/archive" className="header-btn">Archive</Link>
            <Link href="/settings" className="header-btn">Settings</Link>
          </div>
        </div>

        {/* Quick Capture — inside header */}
        <div className="px-6 pb-5">
          <QuickCapture />
        </div>
      </header>

      {/* ── Board ──────────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden">
        <div className="flex gap-3 h-full px-5 py-4 overflow-x-auto">
          {PRIORITY_COLS.map((col) => {
            const tasks = byPriority[col.key] ?? [];
            const done = doneByPriority[col.key] ?? [];
            const total = tasks.length + (showArchive ? done.length : 0);

            return (
              <div
                key={col.key}
                className="flex flex-col flex-1 min-w-[220px] rounded-2xl overflow-hidden"
                style={{ background: "var(--column-bg)", minWidth: 220 }}
              >
                {/* Column header */}
                <div className="px-4 pt-3.5 pb-3 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: col.color }}
                      />
                      <span
                        className="text-[13px] font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {col.label}
                      </span>
                    </div>
                    {total > 0 && (
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: col.colorLight, color: col.color }}
                      >
                        {total}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] mt-0.5 ml-4" style={{ color: "var(--text-tertiary)" }}>
                    {col.sub}
                  </p>
                </div>

                {/* Divider */}
                <div className="mx-4 mb-3 h-px" style={{ background: "var(--border)" }} />

                {/* Cards — independently scrollable */}
                <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
                  {tasks.map((t) => (
                    <BoardCard key={t.id} task={t} />
                  ))}

                  {showArchive && done.length > 0 && (
                    <>
                      {tasks.length > 0 && (
                        <p className="text-[10px] font-semibold uppercase tracking-widest px-1 pt-2 pb-0.5" style={{ color: "var(--text-tertiary)" }}>
                          Done
                        </p>
                      )}
                      {done.map((t) => (
                        <BoardCard key={t.id} task={t} />
                      ))}
                    </>
                  )}

                  {total === 0 && (
                    <p className="text-[12px] px-1 pt-1" style={{ color: "var(--text-tertiary)" }}>
                      {col.key === "P0" ? "Nothing urgent. Nice." : "Empty."}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
