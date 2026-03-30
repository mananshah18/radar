"use client";

import { useState } from "react";
import { mutate } from "swr";
import type { Task } from "@/types/app";
import { TaskDetail } from "./TaskDetail";


interface Props {
  task: Task;
  priorityColor: string;
}

function revalidate() {
  mutate(
    (key: unknown) => typeof key === "string" && key.startsWith("/api/tasks"),
    undefined,
    { revalidate: true }
  );
}

export function BoardCard({ task, priorityColor }: Props) {
  const [expanded,   setExpanded]   = useState(false);
  const [completing, setCompleting] = useState(false);
  const [deleting,   setDeleting]   = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  async function toggleDone(e: React.MouseEvent) {
    e.stopPropagation();
    if (completing) return;
    setCompleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status: task.status === "Done" ? "Todo" : "Done" }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        setError(d.error ?? "Failed to update task");
        return;
      }
      revalidate();
    } finally {
      setCompleting(false);
    }
  }

  async function deleteTask(e: React.MouseEvent) {
    e.stopPropagation();
    if (deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (res.ok) revalidate();
    } finally {
      setDeleting(false);
    }
  }

  const isDone    = task.status === "Done";
  const isOverdue = !isDone && task.dueDate && new Date(task.dueDate) < new Date();

  // Build inline meta parts
  const metaParts: { text: string; color?: string }[] = [];
  if (task.subcategory?.name)             metaParts.push({ text: task.subcategory.name });
  else if (task.category?.name)           metaParts.push({ text: task.category.name });
  if (task.effort)                        metaParts.push({ text: task.effort.toLowerCase() });
  if (task.status === "In Progress")      metaParts.push({ text: "in progress", color: "var(--stamp-blue)" });
  if (task.status === "Waiting On")       metaParts.push({ text: `waiting · ${task.waitingOn || "someone"}`, color: "var(--stamp-amber)" });
  if (isOverdue && task.dueDate)          metaParts.push({ text: "overdue", color: "var(--stamp-red)" });
  else if (task.dueDate && !isDone)       metaParts.push({ text: new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) });

  return (
    <div
      className="board-card group"
      onClick={() => setExpanded((p) => !p)}
    >
      <div className="board-card-inner">
        {/* Top row: priority dot + checkbox + title + delete */}
        <div className="flex items-start gap-2">

          {/* Priority dot */}
          <div
            className="flex-shrink-0 mt-[5px]"
            style={{ width: "8px", height: "8px", borderRadius: "50%", background: priorityColor }}
          />

          {/* Checkbox */}
          <button
            onClick={toggleDone}
            disabled={completing}
            className="mt-[2px] flex-shrink-0 w-[15px] h-[15px] transition-all flex items-center justify-center"
            style={{
              border:       `1.5px solid ${isDone ? priorityColor : "var(--border-ink)"}`,
              borderRadius: "2px",
              background:   isDone ? priorityColor : "transparent",
            }}
          >
            {isDone && (
              <svg className="check-animate" width="8" height="8" viewBox="0 0 9 9" fill="none">
                <path
                  d="M1.5 4.5l2 2 4-4"
                  stroke="#ffffff"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>

          {/* Title */}
          <p
            className={`flex-1 leading-snug ${isDone ? "line-through" : ""}`}
            style={{
              fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)",
              fontSize:   "15px",
              fontWeight: 450,
              color:      isDone ? "var(--ink-ghost)" : isOverdue ? "var(--stamp-red)" : "var(--ink)",
            }}
          >
            {task.title}
          </p>

          {/* Delete */}
          <button
            onClick={deleteTask}
            disabled={deleting}
            className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 w-4 h-4 flex items-center justify-center"
            style={{ fontSize: "16px", color: "var(--ink-ghost)", lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* Meta row */}
        {metaParts.length > 0 && (
          <p className="mt-1.5 pl-[23px]" style={{ fontSize: "12px", color: "var(--ink-ghost)" }}>
            {metaParts.map((part, i) => (
              <span key={i}>
                {i > 0 && <span style={{ margin: "0 4px", opacity: 0.5 }}>·</span>}
                <span style={part.color ? { color: part.color } : undefined}>{part.text}</span>
              </span>
            ))}
          </p>
        )}

        {/* Error */}
        {error && (
          <p className="mt-1 pl-[23px]" style={{ fontSize: "11px", color: "var(--stamp-red)" }}>
            {error}
          </p>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ borderTop: "1px solid var(--border-ink)" }}
        >
          <TaskDetail task={task} onClose={() => setExpanded(false)} />
        </div>
      )}
    </div>
  );
}
