"use client";

import { useState, useRef, useEffect } from "react";
import { mutate } from "swr";
import type { Task } from "@/types/app";

const PLACEHOLDERS = [
  "What's on fire right now?",
  "That thing you just agreed to in the meeting...",
  "Quick, before the next standup...",
  "What keeps getting pushed to tomorrow?",
  "Drop it before it disappears into the void",
  "Brain dump — AI will sort it out",
  "What's blocking the team?",
  "That thing haunting you since last week...",
  "What needs to ship before Friday?",
  "Dump anything. Radar turns it into a plan.",
  "What just landed in your lap?",
];

function PencilIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M11.5 1.5L14.5 4.5L5 14H2V11L11.5 1.5Z"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
      />
      <path d="M9.5 3.5L12.5 6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function revalidate() {
  mutate(
    (key: unknown) => typeof key === "string" && key.startsWith("/api/tasks"),
    undefined,
    { revalidate: true }
  );
}

export function QuickCapture() {
  const [text,               setText]               = useState("");
  const [loading,            setLoading]            = useState(false);
  const [hint,               setHint]               = useState<string | null>(null);
  const [placeholderIndex,   setPlaceholderIndex]   = useState(0);
  const [placeholderVisible, setPlaceholderVisible] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // #34/#37 — clean up both interval and inner timeout on unmount
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const interval = setInterval(() => {
      setPlaceholderVisible(false);
      timeoutId = setTimeout(() => {
        setPlaceholderIndex((i) => (i + 1) % PLACEHOLDERS.length);
        setPlaceholderVisible(true);
      }, 300);
    }, 3500);
    return () => {
      clearInterval(interval);
      clearTimeout(timeoutId);
    };
  }, []);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setHint("Classifying…");

    try {
      // Single request — AI classification happens server-side
      const res  = await fetch("/api/tasks", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ rawTitle: trimmed, classify: true }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        setHint(err.error ?? "Something went wrong — try again");
        setTimeout(() => setHint(null), 4000);
        return;
      }

      const task = await res.json() as Task;
      const location = task.subcategory?.name ?? task.category?.name ?? "Unassigned";
      const statusPart = task.status === "Waiting On" ? " · waiting" : task.status === "In Progress" ? " · in progress" : "";
      setHint(`→ ${location} · ${task.priority} · ${task.effort}${statusPart}`);

      setText("");
      setTimeout(() => setHint(null), 4000);
      revalidate();
    } catch {
      setHint("Something went wrong — try again");
      setTimeout(() => setHint(null), 3000);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Capture box */}
      <div
        style={{
          border:       "1px solid var(--border-ink)",
          borderRadius: "8px",
          padding:      "10px 14px",
          background:   "var(--paper-surface)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <span className="flex-shrink-0" style={{ color: "var(--ink-ghost)" }}>
            <PencilIcon />
          </span>

          <div className="flex-1 relative">
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={loading}
              autoFocus
              className="w-full py-0.5 bg-transparent outline-none disabled:opacity-50"
              style={{ fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)", fontSize: "15px", color: "var(--ink)" }}
            />
            {!text && (
              <span
                className="absolute inset-0 flex items-center pointer-events-none select-none transition-opacity duration-300"
                style={{
                  fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)",
                  fontSize:   "15px",
                  fontStyle:  "italic",
                  color:      "var(--ink-ghost)",
                  opacity:    placeholderVisible ? 1 : 0,
                }}
              >
                {PLACEHOLDERS[placeholderIndex]}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={!text.trim() || loading}
            className="flex-shrink-0 stamp-chip disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
            style={{ color: "var(--stamp-blue)", cursor: "pointer", padding: "3px 10px", fontSize: "11px", fontWeight: 600 }}
          >
            {loading ? "…" : "ADD"}
          </button>
        </div>

        {hint && (
          <p
            className="mt-2 pl-[23px]"
            style={{
              fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)",
              fontSize:   "13px",
              fontStyle:  "italic",
              color:      hint.startsWith("→") ? "var(--stamp-blue)" : "var(--stamp-red)",
            }}
          >
            {hint}
          </p>
        )}
      </div>
    </form>
  );
}
