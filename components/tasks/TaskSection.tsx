"use client";

import { useState } from "react";
import type { Task, Bucket } from "@/lib/db";
import { TaskRow } from "./TaskRow";

interface Props {
  title: string;
  subtitle?: string;
  tasks: Task[];
  showBucket?: boolean;
  bucket?: Bucket;
  emptyMessage?: string;
  accentColor?: string;
  hideIfEmpty?: boolean;
  includeArchive?: boolean;
}

export function TaskSection({
  title,
  subtitle,
  tasks,
  showBucket,
  bucket,
  emptyMessage,
  accentColor,
  hideIfEmpty,
  includeArchive,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);

  const visibleTasks = includeArchive
    ? tasks
    : tasks.filter((t) => t.status !== "Done");

  const doneTasks = tasks.filter((t) => t.status === "Done");
  const activeTasks = visibleTasks.filter((t) => t.status !== "Done");

  if (hideIfEmpty && activeTasks.length === 0) return null;

  const displayTasks = includeArchive ? tasks : activeTasks;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "var(--surface)",
        boxShadow: "var(--shadow-sm)",
        border: "1px solid var(--border)",
      }}
    >
      {/* Section header */}
      <div
        className="flex items-center justify-between px-5 py-3.5 cursor-pointer select-none"
        style={{ borderBottom: displayTasks.length > 0 || !collapsed ? "1px solid var(--border)" : "none" }}
        onClick={() => setCollapsed((p) => !p)}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {accentColor && (
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: accentColor }}
            />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2
                className="text-[14px] font-semibold truncate"
                style={{ color: "var(--text-primary)" }}
              >
                {title}
              </h2>
              {displayTasks.length > 0 && (
                <span
                  className="text-[11px] font-medium px-1.5 py-0.5 rounded-full"
                  style={{
                    background: accentColor
                      ? `${accentColor}15`
                      : "var(--surface-alt)",
                    color: accentColor ?? "var(--text-tertiary)",
                  }}
                >
                  {displayTasks.length}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
        <span
          className="text-[11px] transition-transform flex-shrink-0 ml-3"
          style={{
            color: "var(--text-tertiary)",
            transform: collapsed ? "rotate(-90deg)" : "none",
          }}
        >
          ▾
        </span>
      </div>

      {/* Tasks */}
      {!collapsed && (
        <>
          {displayTasks.length === 0 ? (
            <p
              className="px-5 py-4 text-[13px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              {emptyMessage ?? "No tasks here."}
            </p>
          ) : (
            <div>
              {displayTasks.map((t, i) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  showBucket={showBucket}
                  isLast={i === displayTasks.length - 1}
                />
              ))}
            </div>
          )}

          {/* Done tasks (only shown when includeArchive) */}
          {includeArchive && doneTasks.length > 0 && activeTasks.length > 0 && (
            <div style={{ borderTop: "1px solid var(--border)" }}>
              <p
                className="px-5 py-2 text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: "var(--text-tertiary)" }}
              >
                Completed
              </p>
              {doneTasks.map((t, i) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  showBucket={showBucket}
                  isLast={i === doneTasks.length - 1}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
