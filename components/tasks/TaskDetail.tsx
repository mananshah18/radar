"use client";

import { useState } from "react";
import { mutate } from "swr";
import useSWR from "swr";
import type { Task, Bucket, Priority, Effort, Status } from "@/lib/db";
import { PRIORITIES } from "@/components/ui/PriorityBadge";
import { EFFORTS } from "@/components/ui/EffortChip";

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const STATUS_OPTIONS: Status[] = ["Todo", "In Progress", "Waiting On", "Done"];
const SUB_AREAS = ["Personalization", "Agent", "UX"];

interface Props {
  task: Task;
  onClose: () => void;
}

export function TaskDetail({ task, onClose }: Props) {
  const [form, setForm] = useState({
    title: task.title,
    notes: task.notes ?? "",
    priority: task.priority,
    effort: task.effort,
    status: task.status,
    waiting_on: task.waiting_on ?? "",
    sub_area: task.sub_area ?? "",
    bucket_id: task.bucket_id,
  });
  const [saving, setSaving] = useState(false);

  const { data: buckets = [] } = useSWR<Bucket[]>("/api/buckets", fetcher);
  const isNewAppLaunch =
    buckets.find((b) => b.id === form.bucket_id)?.slug === "mobile-new-app-launch";

  function set<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((p) => ({ ...p, [key]: val }));
  }

  async function save() {
    setSaving(true);
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          notes: form.notes || null,
          priority: form.priority,
          effort: form.effort,
          status: form.status,
          waiting_on: form.status === "Waiting On" ? form.waiting_on || null : null,
          sub_area: isNewAppLaunch ? form.sub_area || null : null,
          bucket_id: form.bucket_id,
        }),
      });
      mutate(
        (key: string) =>
          typeof key === "string" &&
          (key.startsWith("/api/tasks") || key.startsWith("/api/buckets")),
        undefined,
        { revalidate: true }
      );
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const labelCls = "text-[10px] font-semibold uppercase tracking-widest mb-1 block";
  const inputCls =
    "w-full rounded-lg px-3 py-2 text-[13px] outline-none transition-colors";

  return (
    <div
      className="px-5 pb-4 pt-2"
      style={{ borderTop: "1px solid var(--border)", background: "var(--surface-alt)" }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="space-y-3 max-w-2xl">
        {/* Title */}
        <input
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          className={inputCls}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border-med)",
            color: "var(--text-primary)",
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
            background: "var(--surface)",
            border: "1px solid var(--border-med)",
            color: "var(--text-primary)",
          }}
        />

        {/* Controls row */}
        <div className="flex flex-wrap gap-4">
          {/* Priority */}
          <div>
            <label className={labelCls} style={{ color: "var(--text-tertiary)" }}>
              Priority
            </label>
            <div className="flex gap-1">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  onClick={() => set("priority", p as Priority)}
                  className="px-2 py-1 rounded-lg text-[11px] font-semibold font-mono transition-colors"
                  style={
                    form.priority === p
                      ? {
                          background:
                            p === "P0"
                              ? "rgba(255,59,48,0.12)"
                              : p === "P1"
                              ? "rgba(255,149,0,0.12)"
                              : p === "P2"
                              ? "rgba(255,204,0,0.15)"
                              : "rgba(0,0,0,0.06)",
                          color:
                            p === "P0"
                              ? "var(--red)"
                              : p === "P1"
                              ? "var(--orange)"
                              : p === "P2"
                              ? "#b8860b"
                              : "var(--text-secondary)",
                          border: "1px solid transparent",
                        }
                      : {
                          background: "var(--surface)",
                          color: "var(--text-tertiary)",
                          border: "1px solid var(--border-med)",
                        }
                  }
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Effort */}
          <div>
            <label className={labelCls} style={{ color: "var(--text-tertiary)" }}>
              Effort
            </label>
            <div className="flex gap-1">
              {EFFORTS.map((ef) => (
                <button
                  key={ef}
                  onClick={() => set("effort", ef as Effort)}
                  className="px-2 py-1 rounded-lg text-[11px] transition-colors"
                  style={
                    form.effort === ef
                      ? {
                          background:
                            ef === "Quick"
                              ? "rgba(52,199,89,0.1)"
                              : ef === "Medium"
                              ? "rgba(0,113,227,0.1)"
                              : "rgba(175,82,222,0.1)",
                          color:
                            ef === "Quick"
                              ? "var(--green)"
                              : ef === "Medium"
                              ? "var(--accent)"
                              : "var(--purple)",
                          border: "1px solid transparent",
                        }
                      : {
                          background: "var(--surface)",
                          color: "var(--text-tertiary)",
                          border: "1px solid var(--border-med)",
                        }
                  }
                >
                  {ef}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className={labelCls} style={{ color: "var(--text-tertiary)" }}>
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value as Status)}
              className="rounded-lg px-2 py-1 text-[12px] outline-none"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border-med)",
                color: "var(--text-primary)",
              }}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Bucket */}
          <div>
            <label className={labelCls} style={{ color: "var(--text-tertiary)" }}>
              Bucket
            </label>
            <select
              value={form.bucket_id}
              onChange={(e) => set("bucket_id", Number(e.target.value))}
              className="rounded-lg px-2 py-1 text-[12px] outline-none"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border-med)",
                color: "var(--text-primary)",
              }}
            >
              {buckets.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.group_name}: {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sub-area (only for New App Launch) */}
          {isNewAppLaunch && (
            <div>
              <label className={labelCls} style={{ color: "var(--text-tertiary)" }}>
                Sub-area
              </label>
              <select
                value={form.sub_area}
                onChange={(e) => set("sub_area", e.target.value)}
                className="rounded-lg px-2 py-1 text-[12px] outline-none"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border-med)",
                  color: "var(--text-primary)",
                }}
              >
                <option value="">— none —</option>
                {SUB_AREAS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Waiting on */}
        {form.status === "Waiting On" && (
          <input
            value={form.waiting_on}
            onChange={(e) => set("waiting_on", e.target.value)}
            placeholder="Waiting on who / what?"
            className={inputCls}
            style={{
              background: "rgba(255,149,0,0.05)",
              border: "1px solid rgba(255,149,0,0.3)",
              color: "var(--orange)",
            }}
          />
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-0.5">
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-1.5 rounded-xl text-[12px] font-medium transition-colors disabled:opacity-40"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-[12px] transition-colors"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border-med)",
              color: "var(--text-secondary)",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
