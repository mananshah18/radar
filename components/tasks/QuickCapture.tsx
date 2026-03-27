"use client";

import { useState, useRef } from "react";
import { mutate } from "swr";

export function QuickCapture() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setHint("Classifying…");

    try {
      const classifyRes = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      const classification = await classifyRes.json();

      setHint(
        `Saved to ${classification.bucket_name ?? "General"} · ${classification.priority} · ${classification.effort}`
      );

      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: classification.title_cleaned || trimmed,
          bucket_id: classification.bucket_id,
          sub_area: classification.sub_area,
          priority: classification.priority,
          effort: classification.effort,
        }),
      });

      setText("");
      setTimeout(() => setHint(null), 3000);

      mutate(
        (key: string) =>
          typeof key === "string" &&
          (key.startsWith("/api/tasks") || key.startsWith("/api/buckets")),
        undefined,
        { revalidate: true }
      );
    } catch {
      setHint("Something went wrong — try again");
      setTimeout(() => setHint(null), 3000);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div
        className="flex items-center gap-0 rounded-2xl overflow-hidden"
        style={{
          background: "var(--surface)",
          boxShadow: "var(--shadow-md)",
          border: "1px solid var(--border)",
        }}
      >
        <span
          className="pl-4 pr-2 text-[15px] flex-shrink-0"
          style={{ color: "var(--text-tertiary)" }}
        >
          +
        </span>
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Capture a task — AI will classify and rewrite it"
          disabled={loading}
          autoFocus
          className="flex-1 px-1 py-3.5 text-[13.5px] bg-transparent outline-none disabled:opacity-50"
          style={{
            color: "var(--text-primary)",
          }}
        />
        <button
          type="submit"
          disabled={!text.trim() || loading}
          className="m-1.5 px-4 py-2 rounded-xl text-[13px] font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: "var(--accent)",
            color: "#fff",
          }}
        >
          {loading ? "…" : "Add"}
        </button>
      </div>
      {hint && (
        <p
          className="absolute left-4 -bottom-5 text-[11px]"
          style={{ color: "var(--accent)" }}
        >
          {hint}
        </p>
      )}
    </form>
  );
}
