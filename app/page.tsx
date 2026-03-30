"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import type { Area, Task } from "@/types/app";
import { QuickCapture } from "@/components/tasks/QuickCapture";
import { BoardCard } from "@/components/tasks/BoardCard";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const PRIORITY_COLS = [
  { key: "P0", label: "Today",     sub: "Drop everything", color: "var(--stamp-red)"   },
  { key: "P1", label: "This Week", sub: "Ship by Friday",  color: "var(--stamp-amber)" },
  { key: "P2", label: "Sprint",    sub: "In the plan",     color: "var(--stamp-blue)"  },
  { key: "P3", label: "Backlog",   sub: "Someday",         color: "var(--stamp-gray)"  },
];

const DOT_COLOR: Record<string, string> = {
  P0: "var(--stamp-red)",
  P1: "var(--stamp-amber)",
  P2: "var(--stamp-blue)",
  P3: "var(--stamp-gray)",
};

type BoardView = "priority" | "area";

export default function HomePage() {
  const [view,          setView]          = useState<BoardView>("priority");
  const [showArchive,   setShowArchive]   = useState(false);
  const [selectedAreas, setSelectedAreas] = useState<Set<string>>(new Set());

  const { data: areas = [] } = useSWR<Area[]>("/api/areas", fetcher, { refreshInterval: 30_000 });
  const { data: allTasks = [] } = useSWR<Task[]>(
    `/api/tasks?${showArchive ? "includeArchive=true" : ""}`,
    fetcher,
    { refreshInterval: 10_000 }
  );

  const activeTasks  = allTasks.filter((t) => t.status !== "Done");
  const totalActive  = activeTasks.length;
  const waitingCount = activeTasks.filter((t) => t.status === "Waiting On").length;

  const countByArea: Record<string, number> = {};
  for (const t of activeTasks) {
    if (t.areaId) countByArea[t.areaId] = (countByArea[t.areaId] ?? 0) + 1;
  }

  const grouped: Record<string, Area[]> = {};
  for (const a of areas) {
    if (!grouped[a.groupName]) grouped[a.groupName] = [];
    grouped[a.groupName].push(a);
  }

  const isFiltered     = selectedAreas.size > 0;
  const filteredActive = isFiltered
    ? activeTasks.filter((t) => t.areaId && selectedAreas.has(t.areaId))
    : activeTasks;
  const filteredDone = showArchive
    ? allTasks.filter((t) => t.status === "Done" && (!isFiltered || (t.areaId && selectedAreas.has(t.areaId))))
    : [];

  // Priority board data
  const byPriority: Record<string, Task[]>     = { P0: [], P1: [], P2: [], P3: [] };
  const doneByPriority: Record<string, Task[]> = { P0: [], P1: [], P2: [], P3: [] };
  for (const t of filteredActive) { if (byPriority[t.priority])     byPriority[t.priority].push(t); }
  for (const t of filteredDone)   { if (doneByPriority[t.priority]) doneByPriority[t.priority].push(t); }

  // Area board data
  const byArea: Record<string, Task[]> = {};
  for (const a of areas) byArea[a.id] = [];
  byArea["__none__"] = [];
  for (const t of filteredActive) {
    const key = t.areaId && byArea[t.areaId] !== undefined ? t.areaId : "__none__";
    byArea[key].push(t);
  }

  function toggleArea(id: string) {
    setSelectedAreas((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const dateStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const colBase: React.CSSProperties = {
    background:   "rgba(255,255,255,0.5)",
    border:       "1px solid var(--border-ink)",
    borderRadius: "8px",
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "var(--paper-bg)" }}>

      {/* ── Header ───────────────────────────────────────── */}
      <header
        className="flex-shrink-0 px-7 pt-5 pb-4"
        style={{
          borderBottom: "1px solid var(--border-ink)",
          background: "rgba(245,244,240,0.95)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-baseline gap-4">
            <h1
              className="leading-none"
              style={{ fontFamily: "var(--font-dm-serif)", fontSize: "30px", color: "var(--ink)", letterSpacing: "-0.01em" }}
            >
              Radar
            </h1>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: "13px", color: "var(--ink-faint)" }}>{dateStr}</span>
              <span style={{ color: "var(--border-ink)" }}>·</span>
              <span style={{ fontSize: "13px", color: totalActive > 0 ? "var(--stamp-red)" : "var(--ink-ghost)", fontWeight: 500 }}>
                {totalActive} open
              </span>
              {waitingCount > 0 && (
                <>
                  <span style={{ color: "var(--border-ink)" }}>·</span>
                  <span style={{ fontSize: "13px", color: "var(--stamp-amber)", fontWeight: 500 }}>{waitingCount} waiting</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div style={{ display: "flex", border: "1px solid var(--border-ink)", borderRadius: "6px", overflow: "hidden" }}>
              {(["priority", "area"] as BoardView[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  style={{
                    fontSize:   "12px",
                    fontWeight: "500",
                    padding:    "5px 13px",
                    background: view === v ? "var(--ink)" : "transparent",
                    color:      view === v ? "var(--paper-surface)" : "var(--ink-faint)",
                    cursor:     "pointer",
                    borderRight: v === "priority" ? "1px solid var(--border-ink)" : "none",
                    transition: "all 0.1s",
                  }}
                >
                  {v === "priority" ? "Priority" : "Areas"}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowArchive((p) => !p)}
              className={`typewriter-btn${showArchive ? " typewriter-btn-active" : ""}`}
            >
              {showArchive ? "Hide done" : "Show done"}
            </button>
            <Link href="/tasks/archive" className="typewriter-btn">Archive</Link>
            <Link href="/settings" className="typewriter-btn">Settings</Link>
            <Link href="/learn" className="typewriter-btn">Learn</Link>
          </div>
        </div>

        <QuickCapture />
      </header>

      {/* ── Filter Strip ─────────────────────────────────── */}
      <div
        className="flex-shrink-0 flex items-center gap-2 px-7 py-2.5 overflow-x-auto"
        style={{
          borderBottom: "1px solid var(--border-ink)",
          background: "rgba(245,244,240,0.95)",
          backdropFilter: "blur(8px)",
        }}
      >
        <button
          onClick={() => setSelectedAreas(new Set())}
          className={`filter-chip${!isFiltered ? " filter-chip-active" : ""}`}
        >
          All
          <span className="filter-chip-count">{totalActive}</span>
        </button>

        {Object.entries(grouped).map(([group, groupAreas]) => (
          <div key={group} className="flex items-center gap-2">
            <div className="flex-shrink-0" style={{ width: "1px", height: "14px", background: "var(--border-ink)" }} />
            {groupAreas.map((a) => {
              const count  = countByArea[a.id] ?? 0;
              const active = selectedAreas.has(a.id);
              return (
                <button
                  key={a.id}
                  onClick={() => toggleArea(a.id)}
                  className={`filter-chip${active ? " filter-chip-active" : ""}`}
                >
                  {a.name}
                  {count > 0 && <span className="filter-chip-count">{count}</span>}
                </button>
              );
            })}
          </div>
        ))}

        {isFiltered && (
          <button
            onClick={() => setSelectedAreas(new Set())}
            className="ml-1 flex-shrink-0"
            style={{ fontSize: "12px", color: "var(--ink-ghost)" }}
          >
            × Clear
          </button>
        )}
      </div>

      {/* ── Board ────────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden">
        <div className="flex gap-3 h-full px-5 py-4 overflow-x-auto">

          {/* ── Priority View ── */}
          {view === "priority" && PRIORITY_COLS.map((col) => {
            const tasks = byPriority[col.key]     ?? [];
            const done  = doneByPriority[col.key] ?? [];
            const total = tasks.length + (showArchive ? done.length : 0);

            return (
              <div key={col.key} className="flex flex-col flex-1 min-w-[260px]" style={colBase}>
                <div className="flex-shrink-0 px-4 pt-4 pb-3" style={{ borderBottom: "1px solid var(--border-light)" }}>
                  <div className="flex items-center gap-2.5 mb-1">
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: col.color, flexShrink: 0 }} />
                    <span style={{ fontFamily: "var(--font-dm-serif)", fontSize: "20px", color: "var(--ink)", letterSpacing: "-0.01em" }}>
                      {col.label}
                    </span>
                    {total > 0 && (
                      <span style={{ fontSize: "12px", color: "var(--ink-ghost)", fontWeight: 500, marginLeft: "auto" }}>{total}</span>
                    )}
                  </div>
                  <p style={{ fontSize: "12px", color: "var(--ink-ghost)", paddingLeft: "20px" }}>
                    {col.sub}
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto px-3 pb-3 pt-3 space-y-2">
                  {tasks.map((t) => <BoardCard key={t.id} task={t} priorityColor={col.color} />)}
                  {showArchive && done.length > 0 && (
                    <>
                      {tasks.length > 0 && (
                        <p className="px-1 pt-2 pb-0.5" style={{ fontSize: "10px", fontWeight: 600, color: "var(--ink-ghost)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                          Done
                        </p>
                      )}
                      {done.map((t) => <BoardCard key={t.id} task={t} priorityColor={col.color} />)}
                    </>
                  )}
                  {total === 0 && (
                    <p className="px-1 pt-1" style={{ fontSize: "13px", fontStyle: "italic", color: "var(--ink-ghost)" }}>
                      {col.key === "P0" ? "Nothing urgent — nice." : "Empty."}
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {/* ── Area View — one column per group ── */}
          {view === "area" && Object.entries(grouped).map(([group, groupAreas]) => {
            const groupTotal = groupAreas.reduce((sum, a) => sum + (byArea[a.id]?.length ?? 0), 0);

            return (
              <div key={group} className="flex flex-col flex-1 min-w-[280px]" style={colBase}>
                {/* Group header */}
                <div className="flex-shrink-0 px-4 pt-4 pb-3" style={{ borderBottom: "1px solid var(--border-light)" }}>
                  <div className="flex items-center gap-2.5">
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--stamp-blue)", flexShrink: 0 }} />
                    <span style={{ fontFamily: "var(--font-dm-serif)", fontSize: "20px", color: "var(--ink)", letterSpacing: "-0.01em" }}>
                      {group}
                    </span>
                    {groupTotal > 0 && (
                      <span style={{ fontSize: "12px", color: "var(--ink-ghost)", fontWeight: 500, marginLeft: "auto" }}>{groupTotal}</span>
                    )}
                  </div>
                </div>

                {/* Areas within the group */}
                <div className="flex-1 overflow-y-auto px-3 pb-3 pt-3 space-y-4">
                  {groupAreas.map((area) => {
                    const tasks = byArea[area.id] ?? [];
                    return (
                      <div key={area.id}>
                        {/* Area sub-header */}
                        <p
                          className="px-1 pb-1.5"
                          style={{
                            fontSize: "10px",
                            fontWeight: 600,
                            color: "var(--ink-ghost)",
                            letterSpacing: "0.07em",
                            textTransform: "uppercase",
                          }}
                        >
                          {area.name}
                          {tasks.length > 0 && (
                            <span style={{ marginLeft: "6px", opacity: 0.6 }}>{tasks.length}</span>
                          )}
                        </p>
                        <div className="space-y-2">
                          {tasks.map((t) => {
                            const pCol = PRIORITY_COLS.find((c) => c.key === t.priority);
                            return <BoardCard key={t.id} task={t} priorityColor={pCol?.color ?? "var(--ink-ghost)"} />;
                          })}
                          {tasks.length === 0 && (
                            <p className="px-1" style={{ fontSize: "12px", fontStyle: "italic", color: "var(--ink-ghost)" }}>
                              Empty.
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Unassigned column (area view) */}
          {view === "area" && byArea["__none__"]?.length > 0 && (
            <div className="flex flex-col flex-1 min-w-[280px]" style={colBase}>
              <div className="flex-shrink-0 px-4 pt-4 pb-3" style={{ borderBottom: "1px solid var(--border-light)" }}>
                <div className="flex items-center gap-2.5">
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--ink-ghost)", flexShrink: 0 }} />
                  <span style={{ fontFamily: "var(--font-dm-serif)", fontSize: "20px", color: "var(--ink-ghost)", letterSpacing: "-0.01em" }}>
                    Unassigned
                  </span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-3 pb-3 pt-3 space-y-2">
                {byArea["__none__"].map((t) => {
                  const pCol = PRIORITY_COLS.find((c) => c.key === t.priority);
                  return <BoardCard key={t.id} task={t} priorityColor={DOT_COLOR[t.priority] ?? pCol?.color ?? "var(--ink-ghost)"} />;
                })}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
