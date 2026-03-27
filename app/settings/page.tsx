"use client";

import { useState, useEffect } from "react";
import useSWR, { mutate } from "swr";
import Link from "next/link";
import type { Bucket } from "@/lib/db";

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const GROUPS = ["Mobile", "Charts", "General"];

const inputCls =
  "w-full rounded-xl px-3 py-2 text-[13px] outline-none transition-colors";
const inputStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border-med)",
  color: "var(--text-primary)",
};

function SlackSetupSection() {
  const [token, setToken] = useState("");
  const [channelId, setChannelId] = useState("");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [showGuide, setShowGuide] = useState<"A" | "B" | "C" | null>(null);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    fetch("/api/slack/test")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setConfigured(true);
          setTestResult({ ok: true, message: `Connected to #${d.channel_name}` });
        }
      })
      .catch(() => {});
  }, []);

  async function testConnection() {
    if (!token || !channelId) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(
        `/api/slack/test?token=${encodeURIComponent(token)}&channel=${encodeURIComponent(channelId)}`
      );
      const data = await res.json();
      setTestResult({
        ok: data.ok,
        message: data.ok ? `Connected to #${data.channel_name}` : data.error,
      });
    } catch {
      setTestResult({ ok: false, message: "Network error" });
    } finally {
      setTesting(false);
    }
  }

  async function saveCredentials() {
    if (!token || !channelId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/slack/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, channel_id: channelId }),
      });
      if (res.ok) {
        setConfigured(true);
        setTestResult({ ok: true, message: "Saved. Use Sync Slack in the top bar to import." });
        setToken("");
        setChannelId("");
      }
    } finally {
      setSaving(false);
    }
  }

  const guideItem = (
    id: "A" | "B" | "C",
    label: string,
    note: string,
    content: React.ReactNode
  ) => (
    <div style={{ borderTop: "1px solid var(--border)" }}>
      <button
        onClick={() => setShowGuide(showGuide === id ? null : id)}
        className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-black/[0.02]"
      >
        <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
          <span className="font-semibold" style={{ color: "var(--accent)" }}>
            {id}.
          </span>{" "}
          {label}
          <span className="ml-2 text-[10px]" style={{ color: "var(--text-tertiary)" }}>
            {note}
          </span>
        </span>
        <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
          {showGuide === id ? "▲" : "▼"}
        </span>
      </button>
      {showGuide === id && (
        <div
          className="px-4 pb-4 text-[12px] space-y-2"
          style={{ color: "var(--text-secondary)" }}
        >
          {content}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-semibold" style={{ color: "var(--text-primary)" }}>
            Slack Integration
          </h3>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            Import tasks from a Slack channel via the Sync button.
          </p>
        </div>
        {configured && (
          <span
            className="text-[11px] px-2 py-1 rounded-full font-medium"
            style={{ background: "rgba(52,199,89,0.1)", color: "var(--green)" }}
          >
            Connected
          </span>
        )}
      </div>

      <div className="space-y-2">
        <div>
          <label
            className="text-[10px] font-semibold uppercase tracking-widest block mb-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            Token{" "}
            <span className="normal-case font-normal">(xoxp-… or xoxc-…)</span>
          </label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="xoxp-…"
            className={inputCls + " font-mono"}
            style={inputStyle}
          />
        </div>
        <div>
          <label
            className="text-[10px] font-semibold uppercase tracking-widest block mb-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            Channel ID <span className="normal-case font-normal">(e.g. C08XXXXXXXXX)</span>
          </label>
          <input
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
            placeholder="C08XXXXXXXXX"
            className={inputCls + " font-mono"}
            style={inputStyle}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={testConnection}
          disabled={!token || !channelId || testing}
          className="px-3 py-1.5 rounded-xl text-[12px] transition-colors disabled:opacity-30"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border-med)",
            color: "var(--text-secondary)",
          }}
        >
          {testing ? "Testing…" : "Test Connection"}
        </button>
        <button
          onClick={saveCredentials}
          disabled={!token || !channelId || saving || testResult?.ok !== true}
          className="px-3 py-1.5 rounded-xl text-[12px] font-medium transition-colors disabled:opacity-30"
          style={{ background: "var(--accent)", color: "#fff" }}
          title={testResult?.ok !== true ? "Test connection first" : ""}
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {testResult && (
          <span
            className="text-[12px]"
            style={{ color: testResult.ok ? "var(--green)" : "var(--red)" }}
          >
            {testResult.ok ? "✓ " : "✗ "}{testResult.message}
          </span>
        )}
      </div>

      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--border)" }}
      >
        <p
          className="px-4 py-2 text-[11px]"
          style={{
            background: "var(--surface-alt)",
            color: "var(--text-tertiary)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          How to get a token — pick one:
        </p>
        {guideItem(
          "A",
          "Self-service via api.slack.com",
          "try this first",
          <ol className="list-decimal list-inside space-y-1.5">
            <li>
              Go to <span className="font-mono text-[11px]">https://api.slack.com/apps</span> →
              Create New App → From scratch
            </li>
            <li style={{ color: "var(--text-tertiary)" }}>
              If you see "admin approval required" → use option B
            </li>
            <li>Name it anything → OAuth &amp; Permissions → User Token Scopes → add:</li>
            <li>
              <span className="font-mono text-[11px] px-1.5 py-0.5 rounded" style={{ background: "var(--surface-alt)" }}>
                channels:history channels:read groups:history groups:read
              </span>
            </li>
            <li>Install to Workspace → copy the User OAuth Token (xoxp-…)</li>
            <li>Channel ID: open Slack in browser → go to channel → copy C0XXXXXXXXX from URL</li>
          </ol>
        )}
        {guideItem(
          "B",
          "Ask IT (Enterprise Grid)",
          "always works",
          <blockquote
            className="border-l-2 pl-3 italic"
            style={{ borderColor: "var(--accent)", color: "var(--text-secondary)" }}
          >
            "Can you issue me a personal user OAuth token for a local task tool? Read-only scopes only:
            channels:history, groups:history. No bot, no posting."
          </blockquote>
        )}
        {guideItem(
          "C",
          "Extract from browser DevTools",
          "unofficial, expires on logout",
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Open Slack in Chrome → DevTools (F12) → Application → Local Storage</li>
            <li>
              Find <span className="font-mono text-[11px]">localConfig_v2</span> → look for{" "}
              <span className="font-mono text-[11px]">"token":"xoxc-…"</span>
            </li>
            <li>Or: Network tab → filter conversations.history → find token in request headers</li>
          </ol>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { data: buckets = [], isLoading } = useSWR<Bucket[]>("/api/buckets", fetcher);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", group_name: "General", deadline: "" });
  const [error, setError] = useState<string | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Bucket>>({});

  async function createBucket() {
    if (!form.name.trim()) return;
    setError(null);
    try {
      const res = await fetch("/api/buckets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          group_name: form.group_name,
          deadline: form.deadline || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setForm({ name: "", group_name: "General", deadline: "" });
      setAdding(false);
      mutate("/api/buckets");
    } catch (e) {
      setError(String(e));
    }
  }

  async function deleteBucket(id: number) {
    setError(null);
    const res = await fetch(`/api/buckets/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      return;
    }
    mutate("/api/buckets");
  }

  async function saveEdit(id: number) {
    const res = await fetch(`/api/buckets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      setEditId(null);
      mutate("/api/buckets");
    }
  }

  const grouped: Record<string, Bucket[]> = {};
  for (const b of buckets) {
    if (!grouped[b.group_name]) grouped[b.group_name] = [];
    grouped[b.group_name].push(b);
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--page-bg)" }}>
      {/* Sidebar */}
      <aside
        className="flex-shrink-0 flex flex-col h-screen"
        style={{
          width: "var(--sidebar-w)",
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "saturate(180%) blur(20px)",
          WebkitBackdropFilter: "saturate(180%) blur(20px)",
          borderRight: "1px solid var(--border)",
        }}
      >
        <div className="px-5 pt-6 pb-4">
          <Link
            href="/"
            className="text-[13px] flex items-center gap-1.5 mb-4"
            style={{ color: "var(--accent)" }}
          >
            ← Back
          </Link>
          <h1 className="font-semibold text-[17px] tracking-tight" style={{ color: "var(--text-primary)" }}>
            Settings
          </h1>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div
          className="flex items-center px-8 py-3 flex-shrink-0"
          style={{
            background: "rgba(245,245,247,0.85)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            Buckets & Integrations
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 max-w-2xl">
          {error && (
            <div
              className="text-[13px] px-4 py-2 rounded-xl"
              style={{ background: "rgba(255,59,48,0.08)", color: "var(--red)", border: "1px solid rgba(255,59,48,0.2)" }}
            >
              {error}
            </div>
          )}

          {/* Buckets section */}
          <div>
            <h2 className="text-[13px] font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
              Buckets
            </h2>
            {isLoading ? (
              <p className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>Loading…</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(grouped).map(([group, bkts]) => (
                  <div key={group}>
                    <p
                      className="text-[10px] font-semibold uppercase tracking-widest mb-1.5"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {group}
                    </p>
                    <div
                      className="rounded-2xl overflow-hidden"
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        boxShadow: "var(--shadow-sm)",
                      }}
                    >
                      {bkts.map((b, i) => (
                        <div
                          key={b.id}
                          className="flex items-center gap-3 px-4 py-3"
                          style={i < bkts.length - 1 ? { borderBottom: "1px solid var(--border)" } : {}}
                        >
                          {editId === b.id ? (
                            <>
                              <input
                                value={editForm.name ?? b.name}
                                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                                className="flex-1 rounded-lg px-2 py-1 text-[13px] outline-none"
                                style={inputStyle}
                              />
                              <select
                                value={editForm.group_name ?? b.group_name}
                                onChange={(e) => setEditForm((p) => ({ ...p, group_name: e.target.value }))}
                                className="rounded-lg px-2 py-1 text-[12px] outline-none"
                                style={inputStyle}
                              >
                                {GROUPS.map((g) => <option key={g}>{g}</option>)}
                              </select>
                              <input
                                type="date"
                                value={editForm.deadline ?? b.deadline ?? ""}
                                onChange={(e) => setEditForm((p) => ({ ...p, deadline: e.target.value || null }))}
                                className="rounded-lg px-2 py-1 text-[12px] outline-none"
                                style={inputStyle}
                              />
                              <button
                                onClick={() => saveEdit(b.id)}
                                className="text-[12px] font-medium"
                                style={{ color: "var(--accent)" }}
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditId(null)}
                                className="text-[12px]"
                                style={{ color: "var(--text-tertiary)" }}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="flex-1 text-[13px]" style={{ color: "var(--text-primary)" }}>
                                {b.name}
                              </span>
                              {b.deadline && (
                                <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                                  {b.deadline}
                                </span>
                              )}
                              <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                                {b.task_count ?? 0} tasks
                              </span>
                              <button
                                onClick={() => { setEditId(b.id); setEditForm({ name: b.name, group_name: b.group_name, deadline: b.deadline }); }}
                                className="text-[12px] transition-colors"
                                style={{ color: "var(--text-tertiary)" }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteBucket(b.id)}
                                className="text-[12px] transition-colors hover:text-[var(--red)]"
                                style={{ color: "var(--text-tertiary)" }}
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add bucket */}
          {adding ? (
            <div
              className="p-4 rounded-2xl space-y-3"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <h4 className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
                New Bucket
              </h4>
              <div className="flex gap-2 flex-wrap">
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Bucket name"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && createBucket()}
                  className="flex-1 rounded-xl px-3 py-1.5 text-[13px] outline-none"
                  style={inputStyle}
                />
                <select
                  value={form.group_name}
                  onChange={(e) => setForm((p) => ({ ...p, group_name: e.target.value }))}
                  className="rounded-xl px-2 py-1.5 text-[12px] outline-none"
                  style={inputStyle}
                >
                  {GROUPS.map((g) => <option key={g}>{g}</option>)}
                </select>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))}
                  title="Optional deadline"
                  className="rounded-xl px-2 py-1.5 text-[12px] outline-none"
                  style={inputStyle}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={createBucket}
                  className="px-4 py-1.5 rounded-xl text-[12px] font-medium"
                  style={{ background: "var(--accent)", color: "#fff" }}
                >
                  Create
                </button>
                <button
                  onClick={() => setAdding(false)}
                  className="px-4 py-1.5 rounded-xl text-[12px]"
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
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl text-[13px] transition-colors w-full"
              style={{
                background: "var(--surface)",
                border: "1px dashed var(--border-med)",
                color: "var(--text-tertiary)",
              }}
            >
              + Add bucket
            </button>
          )}

          {/* Slack Integration */}
          <div
            className="p-5 rounded-2xl"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <SlackSetupSection />
          </div>
        </div>
      </main>
    </div>
  );
}
