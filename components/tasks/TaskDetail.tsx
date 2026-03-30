"use client";

import { useState } from "react";
import { mutate } from "swr";
import useSWR from "swr";
import type { Task, Area, Priority, Effort, Status } from "@/types/app";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_OPTIONS: Status[] = ["Todo", "In Progress", "Waiting On", "Done"];
const PRIORITIES: Priority[]   = ["P0", "P1", "P2", "P3"];
const EFFORTS: Effort[]        = ["Quick", "Medium", "Deep"];

const PRIORITY_COLORS: Record<string, string> = {
  P0: "var(--stamp-red)",
  P1: "var(--stamp-amber)",
  P2: "var(--stamp-blue)",
  P3: "var(--stamp-gray)",
};

const EFFORT_COLORS: Record<string, string> = {
  Quick:  "var(--stamp-green)",
  Medium: "var(--stamp-blue)",
  Deep:   "var(--stamp-gray)",
};

interface Props {
  task: Task;
  onClose: () => void;
}

function revalidate() {
  mutate(
    (key: unknown) => typeof key === "string" && key.startsWith("/api/tasks"),
    undefined,
    { revalidate: true }
  );
}

export function TaskDetail({ task, onClose }: Props) {
  const [form, setForm] = useState({
    title:     task.title,
    notes:     task.notes ?? "",
    priority:  task.priority as Priority,
    effort:    task.effort  as Effort,
    status:    task.status  as Status,
    waitingOn: task.waitingOn ?? "",
    areaId:    task.areaId ?? "",
    dueDate:   task.dueDate ? task.dueDate.slice(0, 10) : "",
  });
  const [saving, setSaving] = useState(false);

  const { data: areas = [] } = useSWR<Area[]>("/api/areas", fetcher);

  function set<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((p) => ({ ...p, [key]: val }));
  }

  async function save() {
    setSaving(true);
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:     form.title,
          notes:     form.notes || null,
          priority:  form.priority,
          effort:    form.effort,
          status:    form.status,
          waitingOn: form.status === "Waiting On" ? form.waitingOn || null : null,
          areaId:    form.areaId || null,
          dueDate:   form.dueDate || null,
        }),
      });
      revalidate();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const labelCls = "block mb-1 uppercase tracking-widest font-semibold";
  const inputCls = "w-full px-3 py-2 outline-none transition-colors";

  return (
    <div
      className="px-4 pb-4 pt-3"
      style={{ background: "var(--paper-bg)" }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="space-y-3 max-w-2xl">

        {/* Title */}
        <input
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          className={inputCls}
          style={{
            fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)",
            fontSize:   "13px",
            color:      "var(--ink)",
            background: "var(--paper-surface)",
            border:     "1px solid var(--border-ink)",
            borderRadius: "5px",
          }}
        />

        {/* Notes */}
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Notes, links, context…"
          rows={2}
          className={`${inputCls} resize-none`}
          style={{
            fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)",
            fontSize:   "13px",
            color:      "var(--ink)",
            background: "var(--paper-surface)",
            border:     "1px solid var(--border-ink)",
            borderRadius: "5px",
          }}
        />

        {/* Controls row */}
        <div className="flex flex-wrap gap-4">

          {/* Priority */}
          <div>
            <label className={labelCls} style={{ fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)", fontSize: "10px", color: "var(--ink-ghost)" }}>
              Priority
            </label>
            <div className="flex gap-1">
              {PRIORITIES.map((p) => {
                const active = form.priority === p;
                const color  = PRIORITY_COLORS[p] ?? "var(--ink-faint)";
                return (
                  <button
                    key={p}
                    onClick={() => set("priority", p)}
                    className="stamp-chip transition-opacity"
                    style={{
                      color:      active ? "var(--paper-surface)" : color,
                      background: active ? color : "transparent",
                      cursor:     "pointer",
                      padding:    "3px 8px",
                      fontSize:   "10px",
                      opacity:    active ? 1 : 0.55,
                    }}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Effort */}
          <div>
            <label className={labelCls} style={{ fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)", fontSize: "10px", color: "var(--ink-ghost)" }}>
              Effort
            </label>
            <div className="flex gap-1">
              {EFFORTS.map((ef) => {
                const active = form.effort === ef;
                const color  = EFFORT_COLORS[ef] ?? "var(--ink-faint)";
                return (
                  <button
                    key={ef}
                    onClick={() => set("effort", ef)}
                    className="stamp-chip transition-opacity"
                    style={{
                      color:      active ? "var(--paper-surface)" : color,
                      background: active ? color : "transparent",
                      cursor:     "pointer",
                      padding:    "3px 8px",
                      fontSize:   "10px",
                      opacity:    active ? 1 : 0.55,
                    }}
                  >
                    {ef}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className={labelCls} style={{ fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)", fontSize: "10px", color: "var(--ink-ghost)" }}>
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value as Status)}
              className="px-2 py-1 outline-none"
              style={{
                fontFamily:   "var(--font-inter, 'Inter', system-ui, sans-serif)",
                fontSize:     "12px",
                background:   "var(--paper-surface)",
                border:       "1px solid var(--border-ink)",
                borderRadius: "5px",
                color:        "var(--ink)",
              }}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Area */}
          <div>
            <label className={labelCls} style={{ fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)", fontSize: "10px", color: "var(--ink-ghost)" }}>
              Area
            </label>
            <select
              value={form.areaId}
              onChange={(e) => set("areaId", e.target.value)}
              className="px-2 py-1 outline-none"
              style={{
                fontFamily:   "var(--font-inter, 'Inter', system-ui, sans-serif)",
                fontSize:     "12px",
                background:   "var(--paper-surface)",
                border:       "1px solid var(--border-ink)",
                borderRadius: "5px",
                color:        "var(--ink)",
              }}
            >
              <option value="">— none —</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.groupName !== "General" ? `${a.groupName}: ` : ""}{a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Due date */}
          <div>
            <label className={labelCls} style={{ fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)", fontSize: "10px", color: "var(--ink-ghost)" }}>
              Due date
            </label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => set("dueDate", e.target.value)}
              className="px-2 py-1 outline-none"
              style={{
                fontFamily:   "var(--font-inter, 'Inter', system-ui, sans-serif)",
                fontSize:     "12px",
                background:   "var(--paper-surface)",
                border:       "1px solid var(--border-ink)",
                borderRadius: "5px",
                color:        form.dueDate ? "var(--ink)" : "var(--ink-ghost)",
              }}
            />
          </div>
        </div>

        {/* Waiting on */}
        {form.status === "Waiting On" && (
          <input
            value={form.waitingOn}
            onChange={(e) => set("waitingOn", e.target.value)}
            placeholder="Waiting on who / what?"
            className={inputCls}
            style={{
              fontFamily:   "var(--font-inter, 'Inter', system-ui, sans-serif)",
              fontSize:     "13px",
              background:   "var(--paper-surface)",
              border:       "1px solid var(--stamp-amber)",
              borderRadius: "5px",
              color:        "var(--stamp-amber)",
            }}
          />
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={save}
            disabled={saving}
            className="typewriter-btn disabled:opacity-40"
            style={{
              background:  "var(--ink)",
              color:       "var(--paper-bg)",
              borderColor: "var(--ink)",
            }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button onClick={onClose} className="typewriter-btn">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
