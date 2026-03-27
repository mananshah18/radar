"use client";

import { useState } from "react";
import { mutate } from "swr";
import type { Task } from "@/lib/db";
import { PriorityBadge } from "@/components/ui/PriorityBadge";
import { TaskDetail } from "./TaskDetail";

interface Props {
  task: Task;
  showBucket?: boolean;
  isLast?: boolean;
}

export function TaskRow({ task, showBucket, isLast }: Props) {
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
        (key: string) =>
          typeof key === "string" &&
          (key.startsWith("/api/tasks") || key.startsWith("/api/buckets")),
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
        (key: string) =>
          typeof key === "string" &&
          (key.startsWith("/api/tasks") || key.startsWith("/api/buckets")),
        undefined,
        { revalidate: true }
      );
    } finally {
      setDeleting(false);
    }
  }

  const isDone = task.status === "Done";

  return (
    <div
      className={!isLast ? "border-b" : ""}
      style={{ borderColor: "var(--border)" }}
    >
      <div
        className="task-row flex items-start gap-3 px-5 py-3 cursor-pointer"
        onClick={() => setExpanded((p) => !p)}
      >
        {/* Checkbox */}
        <button
          onClick={toggleDone}
          disabled={completing}
          className={`mt-0.5 flex-shrink-0 w-[18px] h-[18px] rounded-full border-2 transition-all flex items-center justify-center ${
            isDone
              ? "border-transparent"
              : "hover:border-[var(--accent)]"
          }`}
          style={{
            borderColor: isDone ? "var(--green)" : "var(--text-tertiary)",
            background: isDone ? "var(--green)" : "transparent",
          }}
        >
          {isDone && (
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
              <path
                d="M1.5 4.5l2 2 4-4"
                stroke="white"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <p
            className={`text-[13.5px] leading-5 ${isDone ? "line-through" : ""}`}
            style={{ color: isDone ? "var(--text-tertiary)" : "var(--text-primary)" }}
          >
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {showBucket && task.bucket_name && (
              <span
                className="text-[11px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                {task.bucket_name}
              </span>
            )}
            {task.sub_area && (
              <span
                className="text-[11px] px-1.5 py-0.5 rounded-full"
                style={{
                  background: "var(--accent-light)",
                  color: "var(--accent)",
                }}
              >
                {task.sub_area}
              </span>
            )}
            {task.status === "Waiting On" && (
              <span
                className="text-[11px] px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(255,149,0,0.1)", color: "var(--orange)" }}
              >
                ⏳ {task.waiting_on ? `${task.waiting_on}` : "Waiting"}
              </span>
            )}
            {task.status === "In Progress" && (
              <span
                className="text-[11px] px-1.5 py-0.5 rounded-full"
                style={{ background: "var(--accent-light)", color: "var(--accent)" }}
              >
                In Progress
              </span>
            )}
          </div>
        </div>

        {/* Right side: priority + delete */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <PriorityBadge priority={task.priority} />
          <button
            onClick={deleteTask}
            disabled={deleting}
            className="task-delete w-5 h-5 rounded flex items-center justify-center text-[13px] transition-colors hover:bg-red-50"
            style={{ color: "var(--text-tertiary)" }}
          >
            ×
          </button>
        </div>
      </div>

      {expanded && (
        <TaskDetail task={task} onClose={() => setExpanded(false)} />
      )}
    </div>
  );
}
