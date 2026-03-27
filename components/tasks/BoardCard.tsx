"use client";

import { useState } from "react";
import { mutate } from "swr";
import type { Task } from "@/lib/db";
import { TaskDetail } from "./TaskDetail";

const EFFORT_COLOR: Record<string, { bg: string; color: string }> = {
  Quick:  { bg: "rgba(52,199,89,0.1)",   color: "#28a745" },
  Medium: { bg: "rgba(0,113,227,0.1)",   color: "var(--accent)" },
  Deep:   { bg: "rgba(175,82,222,0.1)",  color: "var(--purple)" },
};

export function BoardCard({ task }: { task: Task }) {
  const [expanded, setExpanded] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function toggleDone(e: React.MouseEvent) {
    e.stopPropagation();
    if (completing) return;
    setCompleting(true);
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: task.status === "Done" ? "Todo" : "Done" }),
      });
      mutate(
        (key: string) => typeof key === "string" && (key.startsWith("/api/tasks") || key.startsWith("/api/buckets")),
        undefined,
        { revalidate: true }
      );
    } finally {
      setCompleting(false);
    }
  }

  async function deleteTask(e: React.MouseEvent) {
    e.stopPropagation();
    if (deleting) return;
    setDeleting(true);
    try {
      await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      mutate(
        (key: string) => typeof key === "string" && (key.startsWith("/api/tasks") || key.startsWith("/api/buckets")),
        undefined,
        { revalidate: true }
      );
    } finally {
      setDeleting(false);
    }
  }

  const isDone = task.status === "Done";
  const effort = EFFORT_COLOR[task.effort] ?? EFFORT_COLOR.Medium;

  return (
    <div
      className="board-card group"
      onClick={() => setExpanded((p) => !p)}
    >
      <div className="board-card-inner">
        {/* Top row: checkbox + title + delete */}
        <div className="flex items-start gap-2.5">
          <button
            onClick={toggleDone}
            disabled={completing}
            className="mt-[2px] flex-shrink-0 w-[16px] h-[16px] rounded border-2 transition-all flex items-center justify-center"
            style={{
              borderColor: isDone ? "var(--green)" : "rgba(0,0,0,0.2)",
              background: isDone ? "var(--green)" : "transparent",
            }}
          >
            {isDone && (
              <svg width="7" height="7" viewBox="0 0 9 9" fill="none">
                <path d="M1.5 4.5l2 2 4-4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>

          <p
            className={`flex-1 text-[13px] leading-snug font-medium ${isDone ? "line-through" : ""}`}
            style={{ color: isDone ? "var(--text-tertiary)" : "var(--text-primary)" }}
          >
            {task.title}
          </p>

          <button
            onClick={deleteTask}
            disabled={deleting}
            className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 w-4 h-4 flex items-center justify-center rounded text-[13px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            ×
          </button>
        </div>

        {/* Chips row */}
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {task.bucket_name && (
            <span className="board-chip">{task.bucket_name}</span>
          )}
          {task.sub_area && (
            <span className="board-chip" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
              {task.sub_area}
            </span>
          )}
          {task.effort && (
            <span className="board-chip" style={{ background: effort.bg, color: effort.color }}>
              {task.effort}
            </span>
          )}
          {task.status === "In Progress" && (
            <span className="board-chip" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
              In progress
            </span>
          )}
          {task.status === "Waiting On" && (
            <span className="board-chip" style={{ background: "rgba(255,149,0,0.1)", color: "var(--orange)" }}>
              ⏳ {task.waiting_on || "Waiting"}
            </span>
          )}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div onClick={(e) => e.stopPropagation()} style={{ borderTop: "1px solid var(--border)" }}>
          <TaskDetail task={task} onClose={() => setExpanded(false)} />
        </div>
      )}
    </div>
  );
}
