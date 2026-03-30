"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import Link from "next/link";
import type { Task } from "@/types/app";
import { QuickCapture } from "@/components/tasks/QuickCapture";
import { BoardCard } from "@/components/tasks/BoardCard";

/* ── Welcome modal (shown to new users with 0 areas) ───── */
function WelcomeModal({ onDone }: { onDone: () => void }) {
  const [names,   setNames]   = useState(["", ""]);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  function updateName(i: number, val: string) {
    setNames((prev) => prev.map((n, idx) => idx === i ? val : n));
  }

  function addInput() {
    if (names.length < 8) setNames((p) => [...p, ""]);
  }

  async function handleStart() {
    const toCreate = names.map((n) => n.trim()).filter(Boolean);
    if (toCreate.length === 0) { onDone(); return; }
    setSaving(true);
    setError(null);
    try {
      for (const name of toCreate) {
        const res = await fetch("/api/categories", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ name }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(d.error ?? "Failed to create category");
        }
      }
      mutate("/api/categories");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        background: "rgba(0,0,0,0.35)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        style={{
          width: "100%", maxWidth: 420,
          background: "var(--paper-surface)",
          border: "1px solid var(--border-ink)",
          borderRadius: 10,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          padding: "2rem",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontFamily: "var(--font-dm-serif)", fontSize: 26, color: "var(--ink)", marginBottom: 8, letterSpacing: "-0.01em" }}>
          Welcome to Radar
        </h2>
        <p style={{ fontSize: 13, color: "var(--ink-faint)", lineHeight: 1.6, marginBottom: 24, fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)" }}>
          Add your main categories to get started — things like <em>Work</em>, <em>Personal</em>, or <em>Side Projects</em>.
          AI will create more automatically as you capture tasks.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {names.map((n, i) => (
            <input
              key={i}
              value={n}
              onChange={(e) => updateName(i, e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addInput(); } }}
              placeholder={i === 0 ? "e.g. Work" : i === 1 ? "e.g. Personal" : "Another category…"}
              autoFocus={i === 0}
              style={{
                width: "100%",
                background: "var(--paper-bg)",
                border: "1px solid var(--border-ink)",
                borderRadius: 5,
                padding: "8px 12px",
                fontSize: 13,
                color: "var(--ink)",
                fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)",
                outline: "none",
              }}
            />
          ))}
          {names.length < 8 && (
            <button
              onClick={addInput}
              style={{ fontSize: 12, color: "var(--ink-ghost)", cursor: "pointer", textAlign: "left", background: "none", border: "none", padding: "2px 0", fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)" }}
            >
              + Add another category
            </button>
          )}
        </div>

        {error && (
          <p style={{ fontSize: 12, color: "var(--stamp-red)", marginBottom: 12, fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)" }}>
            {error}
          </p>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button
            onClick={handleStart}
            disabled={saving}
            className="typewriter-btn"
            style={{ background: "var(--ink)", color: "var(--paper-surface)", borderColor: "var(--ink)", cursor: "pointer", opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Setting up…" : "Start capturing tasks →"}
          </button>
          <button
            onClick={onDone}
            style={{ fontSize: 12, color: "var(--ink-ghost)", cursor: "pointer", background: "none", border: "none", fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)" }}
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const [view,             setView]             = useState<BoardView>("priority");
  const [showArchive,      setShowArchive]      = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [modalDismissed, setModalDismissed] = useState(false);

  const { data: categories, isLoading: categoriesLoading } = useSWR<import("@/types/app").Category[]>("/api/categories", fetcher, { refreshInterval: 30_000 });
  const categoryList = categories ?? [];
  const showWelcome = !categoriesLoading && !modalDismissed && categoryList.length === 0;

  const { data: allTasks = [] } = useSWR<Task[]>(
    `/api/tasks?${showArchive ? "includeArchive=true" : ""}`,
    fetcher,
    { refreshInterval: 10_000 }
  );

  const activeTasks  = allTasks.filter((t) => t.status !== "Done");
  const totalActive  = activeTasks.length;
  const waitingCount = activeTasks.filter((t) => t.status === "Waiting On").length;

  const countByCategory: Record<string, number> = {};
  for (const t of activeTasks) {
    if (t.categoryId) countByCategory[t.categoryId] = (countByCategory[t.categoryId] ?? 0) + 1;
  }

  const isFiltered     = selectedCategories.size > 0;
  const filteredActive = isFiltered
    ? activeTasks.filter((t) => t.categoryId && selectedCategories.has(t.categoryId))
    : activeTasks;
  const filteredDone = showArchive
    ? allTasks.filter((t) => t.status === "Done" && (!isFiltered || (t.categoryId && selectedCategories.has(t.categoryId))))
    : [];

  // Priority board data
  const byPriority: Record<string, Task[]>     = { P0: [], P1: [], P2: [], P3: [] };
  const doneByPriority: Record<string, Task[]> = { P0: [], P1: [], P2: [], P3: [] };
  for (const t of filteredActive) { if (byPriority[t.priority])     byPriority[t.priority].push(t); }
  for (const t of filteredDone)   { if (doneByPriority[t.priority]) doneByPriority[t.priority].push(t); }

  // Category board data — one column per category, tasks grouped by subcategory within
  const byCategory: Record<string, Task[]> = {};
  for (const c of categoryList) byCategory[c.id] = [];
  byCategory["__none__"] = [];
  for (const t of filteredActive) {
    const key = t.categoryId && byCategory[t.categoryId] !== undefined ? t.categoryId : "__none__";
    byCategory[key].push(t);
  }

  function toggleCategory(id: string) {
    setSelectedCategories((prev) => {
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
      {showWelcome && <WelcomeModal onDone={() => setModalDismissed(true)} />}

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
                  {v === "priority" ? "Priority" : "Categories"}
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
          onClick={() => setSelectedCategories(new Set())}
          className={`filter-chip${!isFiltered ? " filter-chip-active" : ""}`}
        >
          All
          <span className="filter-chip-count">{totalActive}</span>
        </button>

        {categoryList.map((c) => {
          const count  = countByCategory[c.id] ?? 0;
          const active = selectedCategories.has(c.id);
          return (
            <button
              key={c.id}
              onClick={() => toggleCategory(c.id)}
              className={`filter-chip${active ? " filter-chip-active" : ""}`}
            >
              {c.name}
              {count > 0 && <span className="filter-chip-count">{count}</span>}
            </button>
          );
        })}

        {isFiltered && (
          <button
            onClick={() => setSelectedCategories(new Set())}
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

          {/* ── Category View — one column per category, subcategories as sub-headers ── */}
          {view === "area" && categoryList.map((cat) => {
            const catTasks = byCategory[cat.id] ?? [];
            const subs     = cat.subcategories ?? [];

            // Tasks with no subcategory
            const unsubbed = catTasks.filter((t) => !t.subcategoryId);
            // Tasks per subcategory
            const bySub: Record<string, Task[]> = {};
            for (const s of subs) bySub[s.id] = [];
            for (const t of catTasks) {
              if (t.subcategoryId && bySub[t.subcategoryId]) bySub[t.subcategoryId].push(t);
            }

            return (
              <div key={cat.id} className="flex flex-col flex-1 min-w-[280px]" style={colBase}>
                <div className="flex-shrink-0 px-4 pt-4 pb-3" style={{ borderBottom: "1px solid var(--border-light)" }}>
                  <div className="flex items-center gap-2.5">
                    <span style={{ fontFamily: "var(--font-dm-serif)", fontSize: "20px", color: "var(--ink)", letterSpacing: "-0.01em" }}>
                      {cat.name}
                    </span>
                    {catTasks.length > 0 && (
                      <span style={{ fontSize: "12px", color: "var(--ink-ghost)", fontWeight: 500, marginLeft: "auto" }}>{catTasks.length}</span>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-3 pb-3 pt-3 space-y-4">
                  {/* Tasks with no subcategory */}
                  {unsubbed.length > 0 && (
                    <div className="space-y-2">
                      {unsubbed.map((t) => {
                        const pCol = PRIORITY_COLS.find((c) => c.key === t.priority);
                        return <BoardCard key={t.id} task={t} priorityColor={pCol?.color ?? "var(--ink-ghost)"} />;
                      })}
                    </div>
                  )}

                  {/* Subcategory sections */}
                  {subs.map((sub) => {
                    const subTasks = bySub[sub.id] ?? [];
                    if (subTasks.length === 0) return null;
                    return (
                      <div key={sub.id}>
                        <p className="px-1 pb-1.5" style={{ fontSize: "10px", fontWeight: 600, color: "var(--ink-ghost)", letterSpacing: "0.07em", textTransform: "uppercase" }}>
                          {sub.name}
                          <span style={{ marginLeft: "6px", opacity: 0.6 }}>{subTasks.length}</span>
                        </p>
                        <div className="space-y-2">
                          {subTasks.map((t) => {
                            const pCol = PRIORITY_COLS.find((c) => c.key === t.priority);
                            return <BoardCard key={t.id} task={t} priorityColor={pCol?.color ?? "var(--ink-ghost)"} />;
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {catTasks.length === 0 && (
                    <p className="px-1 pt-1" style={{ fontSize: "13px", fontStyle: "italic", color: "var(--ink-ghost)" }}>Empty.</p>
                  )}
                </div>
              </div>
            );
          })}

          {/* Unassigned column (category view) */}
          {view === "area" && (byCategory["__none__"]?.length ?? 0) > 0 && (
            <div className="flex flex-col flex-1 min-w-[280px]" style={colBase}>
              <div className="flex-shrink-0 px-4 pt-4 pb-3" style={{ borderBottom: "1px solid var(--border-light)" }}>
                <span style={{ fontFamily: "var(--font-dm-serif)", fontSize: "20px", color: "var(--ink-ghost)", letterSpacing: "-0.01em" }}>
                  Unassigned
                </span>
              </div>
              <div className="flex-1 overflow-y-auto px-3 pb-3 pt-3 space-y-2">
                {byCategory["__none__"].map((t) => {
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
