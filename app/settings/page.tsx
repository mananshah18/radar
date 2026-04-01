"use client";

import { useState, useEffect, Suspense } from "react";
import useSWR, { mutate } from "swr";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import type { Category, Subcategory } from "@/types/app";

/* ── Slack Integration Section ───────────────────────────────── */
function SlackSection() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Connection status: { ok: false } | { ok: true, channelName: null } | { ok: true, channelName: string }
  const { data: status, isLoading: statusLoading } = useSWR<{ ok: boolean; channelName?: string | null }>(
    "/api/slack/test",
    (url: string) => fetch(url).then((r) => r.json()),
    { revalidateOnFocus: false }
  );

  // Channel list — only fetched once token exists (state B)
  const tokenExists = status?.ok === true;
  const channelPicked = !!(status?.ok && status.channelName);
  const { data: channelsData } = useSWR<{ channels: { id: string; name: string }[] }>(
    tokenExists && !channelPicked ? "/api/slack/channels" : null,
    (url: string) => fetch(url).then((r) => r.json()),
    { revalidateOnFocus: false }
  );

  const [selectedChannel, setSelectedChannel] = useState("");
  const [saving,          setSaving]          = useState(false);
  const [polling,         setPolling]         = useState(false);
  const [msg,             setMsg]             = useState<{ text: string; ok: boolean } | null>(null);
  const [changingChannel, setChangingChannel] = useState(false);

  // Handle ?slack= query param from OAuth callback
  useEffect(() => {
    const slackParam = searchParams.get("slack");
    if (slackParam === "connected") {
      setMsg({ ok: true, text: "Slack connected — pick a channel below" });
      mutate("/api/slack/test");
      router.replace("/settings");
    } else if (slackParam === "denied") {
      setMsg({ ok: false, text: "Slack authorization was cancelled" });
      router.replace("/settings");
    } else if (slackParam === "error") {
      setMsg({ ok: false, text: "Slack connection failed — please try again" });
      router.replace("/settings");
    }
  }, [searchParams, router]);

  async function saveChannel() {
    if (!selectedChannel) return;
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/slack/test", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ channel_id: selectedChannel }),
    });
    setSaving(false);
    const data = await res.json() as { ok: boolean; channelName?: string; error?: string };
    if (data.ok) {
      setMsg({ ok: true, text: `Now watching #${data.channelName}` });
      setChangingChannel(false);
      mutate("/api/slack/test");
    } else {
      setMsg({ ok: false, text: data.error ?? "Failed to save channel" });
    }
  }

  async function disconnect() {
    setMsg(null);
    await fetch("/api/slack/test", { method: "DELETE" });
    setMsg({ ok: true, text: "Disconnected and token revoked" });
    setChangingChannel(false);
    setSelectedChannel("");
    mutate("/api/slack/test");
  }

  async function pollNow() {
    setPolling(true);
    setMsg(null);
    const res  = await fetch("/api/slack/poll");
    setPolling(false);
    const data = await res.json() as { imported?: number; error?: string };
    if (data.error) {
      setMsg({ ok: false, text: data.error });
    } else {
      setMsg({ ok: true, text: `Imported ${data.imported ?? 0} new task${data.imported !== 1 ? "s" : ""}` });
      mutate((key: unknown) => typeof key === "string" && key.startsWith("/api/tasks"), undefined, { revalidate: true });
    }
  }

  const channels = channelsData?.channels ?? [];

  // State A: not connected to Slack at all
  const stateA = !statusLoading && status?.ok === false;
  // State B: token exists, no channel picked yet (or user is changing channel)
  const stateB = tokenExists && (!channelPicked || changingChannel);
  // State C: fully configured
  const stateC = channelPicked && !changingChannel;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 style={{ fontFamily: "var(--font-dm-serif)", fontSize: "14px", letterSpacing: "0.08em", color: "var(--ink)" }}>
            SLACK
          </h2>
          <p style={{ fontSize: "12px", color: "var(--ink-ghost)", marginTop: "2px" }}>
            Import messages from a channel as tasks — only the channel you choose is accessed
          </p>
        </div>
        {stateC && (
          <span className="stamp-chip" style={{ color: "var(--stamp-blue)", fontSize: "10px" }}>
            #{status!.channelName}
          </span>
        )}
      </div>

      <div style={{ background: "var(--paper-surface)", border: "1px solid var(--border-ink)", boxShadow: "2px 2px 0 rgba(0,0,0,0.05)" }}>

        {/* State A — not connected */}
        {stateA && (
          <div style={{ padding: "1rem 1.25rem" }}>
            <p style={{ fontSize: "12px", color: "var(--ink-ghost)", marginBottom: "0.75rem", lineHeight: "1.6" }}>
              Connect your Slack workspace. Radar will only request read access to the single channel you choose — no access to DMs or other channels.
            </p>
            <a
              href="/api/auth/slack"
              className="typewriter-btn"
              style={{ display: "inline-block", background: "var(--ink)", color: "var(--paper-surface)", borderColor: "var(--ink)", padding: "0.4rem 0.9rem", fontSize: "12px", letterSpacing: "0.05em", textDecoration: "none" }}
            >
              Connect to Slack →
            </a>
          </div>
        )}

        {/* State B — token exists, pick a channel */}
        {stateB && (
          <div style={{ padding: "1rem 1.25rem" }}>
            <p style={{ fontSize: "12px", color: "var(--ink-ghost)", marginBottom: "0.75rem" }}>
              {changingChannel ? "Pick a different channel:" : "Workspace connected. Choose a channel to watch:"}
            </p>
            <div className="flex items-center gap-2">
              <select
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value)}
                style={{
                  background:  "var(--paper-surface)",
                  border:      "1px solid var(--border-ink)",
                  color:       channels.length === 0 ? "var(--ink-ghost)" : "var(--ink)",
                  fontFamily:  "var(--font-inter, 'Inter', system-ui, sans-serif)",
                  fontSize:    "13px",
                  outline:     "none",
                  padding:     "0.35rem 0.6rem",
                  flex:        1,
                }}
              >
                <option value="">{channels.length === 0 ? "Loading channels…" : "Select a channel"}</option>
                {channels.map((c) => (
                  <option key={c.id} value={c.id}>#{c.name}</option>
                ))}
              </select>
              <button
                onClick={saveChannel}
                disabled={saving || !selectedChannel}
                className="typewriter-btn"
                style={{ background: "var(--ink)", color: "var(--paper-surface)", borderColor: "var(--ink)", cursor: "pointer", opacity: !selectedChannel ? 0.4 : 1 }}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
            <button
              onClick={disconnect}
              style={{ marginTop: "0.75rem", fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)", fontSize: "11px", color: "var(--ink-ghost)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              Disconnect Slack
            </button>
          </div>
        )}

        {/* State C — fully configured */}
        {stateC && (
          <div style={{ padding: "1rem 1.25rem" }}>
            <p style={{ fontSize: "13px", color: "var(--ink-faint)", marginBottom: "0.75rem" }}>
              Messages in <strong>#{status!.channelName}</strong> are imported every 30 minutes and classified by AI into tasks.
            </p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={pollNow}
                disabled={polling}
                style={{ fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)", fontSize: "12px", letterSpacing: "0.05em", color: "var(--stamp-blue)", border: "1px solid var(--stamp-blue)", background: "transparent", padding: "0.4rem 0.9rem", cursor: "pointer" }}
              >
                {polling ? "Importing…" : "Import now"}
              </button>
              <button
                onClick={() => { setChangingChannel(true); setMsg(null); }}
                style={{ fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)", fontSize: "12px", letterSpacing: "0.05em", color: "var(--ink-faint)", border: "1px solid var(--border-ink)", background: "transparent", padding: "0.4rem 0.9rem", cursor: "pointer" }}
              >
                Change channel
              </button>
              <button
                onClick={disconnect}
                style={{ fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)", fontSize: "12px", letterSpacing: "0.05em", color: "var(--ink-ghost)", border: "1px solid var(--border-ink)", background: "transparent", padding: "0.4rem 0.9rem", cursor: "pointer" }}
              >
                Disconnect
              </button>
            </div>
          </div>
        )}

        {msg && (
          <div style={{ padding: "0.5rem 1.25rem", borderTop: "1px solid var(--border-light)", fontSize: "12px", color: msg.ok ? "var(--stamp-blue)" : "var(--stamp-red)", fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)" }}>
            {msg.ok ? "✓" : "✕"} {msg.text}
          </div>
        )}
      </div>
    </section>
  );
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const inputStyle: React.CSSProperties = {
  background:   "var(--paper-surface)",
  border:       "1px solid var(--border-ink)",
  color:        "var(--ink)",
  fontFamily:   "var(--font-inter, 'Inter', system-ui, sans-serif)",
  fontSize:     "13px",
  outline:      "none",
  padding:      "0.35rem 0.6rem",
};

function revalidateCategories() {
  mutate("/api/categories");
}

/* ── Subcategory row ─────────────────────────────────────────── */
function SubcategoryRow({ sub, onDelete }: { sub: Subcategory; onDelete: (err: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [name,    setName]    = useState(sub.name);
  const [saving,  setSaving]  = useState(false);

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/subcategories/${sub.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name }),
    });
    setSaving(false);
    if (res.ok) { setEditing(false); revalidateCategories(); }
    else {
      const d = await res.json() as { error?: string };
      onDelete(d.error ?? "Failed to save");
    }
  }

  async function deleteSubcategory() {
    const res = await fetch(`/api/subcategories/${sub.id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json() as { error?: string };
      onDelete(d.error ?? "Cannot delete subcategory.");
    } else {
      revalidateCategories();
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 py-1.5 pl-8 pr-4" style={{ borderBottom: "1px solid var(--border-light)" }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && save()}
          style={{ ...inputStyle, flex: 1, fontSize: "12px" }}
        />
        <button onClick={save} disabled={saving} style={{ ...inputStyle, color: "var(--stamp-blue)", cursor: "pointer", background: "transparent" }}>
          {saving ? "…" : "Save"}
        </button>
        <button onClick={() => setEditing(false)} style={{ fontSize: "12px", color: "var(--ink-ghost)", cursor: "pointer", background: "none", border: "none" }}>
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 py-1.5 pl-8 pr-4 group" style={{ borderBottom: "1px solid var(--border-light)" }}>
      <span style={{ fontSize: "12px", color: "var(--ink-faint)", fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)", flex: 1 }}>
        {sub.name}
      </span>
      <span style={{ fontSize: "11px", color: "var(--ink-ghost)", fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)" }}>
        {sub.taskCount ?? 0} tasks
      </span>
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => setEditing(true)} style={{ fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)", fontSize: "11px", color: "var(--ink-faint)", cursor: "pointer" }}>
          Edit
        </button>
        <button onClick={deleteSubcategory} style={{ fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)", fontSize: "11px", color: "var(--stamp-red)", cursor: "pointer" }}>
          Delete
        </button>
      </div>
    </div>
  );
}

/* ── Category row ────────────────────────────────────────────── */
function CategoryRow({ category, onError }: { category: Category; onError: (err: string) => void }) {
  const [editing,     setEditing]     = useState(false);
  const [name,        setName]        = useState(category.name);
  const [saving,      setSaving]      = useState(false);
  const [addingSub,   setAddingSub]   = useState(false);
  const [subName,     setSubName]     = useState("");
  const [creatingSub, setCreatingSub] = useState(false);

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/categories/${category.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name }),
    });
    setSaving(false);
    if (res.ok) { setEditing(false); revalidateCategories(); }
    else {
      const d = await res.json() as { error?: string };
      onError(d.error ?? "Failed to save");
    }
  }

  async function deleteCategory() {
    const res = await fetch(`/api/categories/${category.id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json() as { error?: string };
      onError(d.error ?? "Cannot delete category.");
    } else {
      revalidateCategories();
    }
  }

  async function setAsInbox() {
    await fetch(`/api/categories/${category.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ isInbox: true }),
    });
    revalidateCategories();
  }

  async function createSubcategory() {
    if (!subName.trim()) return;
    setCreatingSub(true);
    const res = await fetch("/api/subcategories", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name: subName.trim(), categoryId: category.id }),
    });
    setCreatingSub(false);
    if (res.ok) {
      setSubName("");
      setAddingSub(false);
      revalidateCategories();
    } else {
      const d = await res.json() as { error?: string };
      onError(d.error ?? "Failed to create subcategory");
    }
  }

  const subs = category.subcategories ?? [];

  return (
    <div style={{ borderBottom: "1px solid var(--border-light)" }}>
      {/* Category name row */}
      {editing ? (
        <div className="flex items-center gap-2 py-2.5 px-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && save()}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={save} disabled={saving} style={{ ...inputStyle, color: "var(--stamp-blue)", cursor: "pointer", background: "transparent" }}>
            {saving ? "…" : "Save"}
          </button>
          <button onClick={() => setEditing(false)} style={{ fontSize: "12px", color: "var(--ink-ghost)", cursor: "pointer", background: "none", border: "none" }}>
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 py-2.5 px-4 group">
          {category.isInbox && (
            <span className="stamp-chip" style={{ color: "var(--stamp-blue)", fontSize: "10px" }}>📥 Inbox</span>
          )}
          <span style={{ flex: 1, fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)", fontSize: "13px", color: "var(--ink)", fontWeight: 500 }}>
            {category.name}
          </span>
          <span style={{ fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)", fontSize: "11px", color: "var(--ink-ghost)" }}>
            {category.taskCount ?? 0} tasks
          </span>
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {!category.isInbox && (
              <button onClick={setAsInbox} style={{ fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)", fontSize: "11px", color: "var(--ink-ghost)", cursor: "pointer" }}>
                Set inbox
              </button>
            )}
            <button onClick={() => setAddingSub((p) => !p)} style={{ fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)", fontSize: "11px", color: "var(--stamp-blue)", cursor: "pointer" }}>
              + Subcategory
            </button>
            <button onClick={() => setEditing(true)} style={{ fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)", fontSize: "11px", color: "var(--ink-faint)", cursor: "pointer" }}>
              Edit
            </button>
            <button onClick={deleteCategory} style={{ fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)", fontSize: "11px", color: "var(--stamp-red)", cursor: "pointer" }}>
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Subcategories */}
      {subs.map((s) => (
        <SubcategoryRow key={s.id} sub={s} onDelete={onError} />
      ))}

      {/* Add subcategory inline */}
      {addingSub && (
        <div className="flex items-center gap-2 py-1.5 pl-8 pr-4" style={{ background: "var(--paper-dark)" }}>
          <input
            value={subName}
            onChange={(e) => setSubName(e.target.value)}
            placeholder="Subcategory name"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && createSubcategory()}
            style={{ ...inputStyle, flex: 1, fontSize: "12px" }}
          />
          <button
            onClick={createSubcategory}
            disabled={creatingSub || !subName.trim()}
            style={{ ...inputStyle, color: "var(--stamp-blue)", cursor: "pointer", background: "transparent" }}
          >
            {creatingSub ? "…" : "Add"}
          </button>
          <button onClick={() => { setAddingSub(false); setSubName(""); }} style={{ fontSize: "12px", color: "var(--ink-ghost)", cursor: "pointer", background: "none", border: "none" }}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Preferences Section ─────────────────────────────────────── */
function PreferencesSection() {
  const [animsOn, setAnimsOn] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("radar_animations") !== "off" : true
  );

  function toggle() {
    const next = !animsOn;
    setAnimsOn(next);
    localStorage.setItem("radar_animations", next ? "on" : "off");
  }

  return (
    <section>
      <h2 style={{ fontFamily: "var(--font-dm-serif)", fontSize: "14px", letterSpacing: "0.08em", color: "var(--ink)", marginBottom: "0.5rem" }}>
        PREFERENCES
      </h2>
      <div style={{ background: "var(--paper-surface)", border: "1px solid var(--border-ink)", padding: "1rem 1.25rem", boxShadow: "2px 2px 0 rgba(0,0,0,0.05)" }}>
        <div className="flex items-center justify-between">
          <div>
            <p style={{ fontSize: "13px", color: "var(--ink-faint)", fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)" }}>
              Completion animations
            </p>
            <p style={{ fontSize: "11px", color: "var(--ink-ghost)", marginTop: "2px", fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)" }}>
              Subtle celebration when you mark a task done
            </p>
          </div>
          <button
            onClick={toggle}
            style={{
              width:        "40px",
              height:       "22px",
              borderRadius: "11px",
              border:       "1.5px solid var(--border-ink)",
              background:   animsOn ? "var(--ink)" : "var(--paper-dark)",
              cursor:       "pointer",
              position:     "relative",
              flexShrink:   0,
              transition:   "background 0.2s ease",
            }}
          >
            <span style={{
              position:   "absolute",
              top:        "2px",
              left:       animsOn ? "18px" : "2px",
              width:      "14px",
              height:     "14px",
              borderRadius: "50%",
              background: animsOn ? "var(--paper-surface)" : "var(--ink-ghost)",
              transition: "left 0.2s ease",
            }} />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ── Settings page ───────────────────────────────────────────── */
export default function SettingsPage() {
  const { data: session } = useSession();
  const { data: categoriesData, isLoading } = useSWR<Category[]>("/api/categories", fetcher);
  const categories = Array.isArray(categoriesData) ? categoriesData : [];
  const [adding,   setAdding]   = useState(false);
  const [newName,  setNewName]  = useState("");
  const [creating, setCreating] = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  async function createCategory() {
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/categories", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error ?? "Failed to create category."); return; }
      setNewName("");
      setAdding(false);
      revalidateCategories();
    } finally {
      setCreating(false);
    }
  }

  const planBadgeColor =
    session?.user?.plan === "trialing" ? "var(--stamp-amber)"
    : session?.user?.plan === "pro"     ? "var(--stamp-blue)"
    : "var(--ink-ghost)";

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper-bg)", fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)" }}>

      {/* Header */}
      <header
        className="px-6 pt-5 pb-4"
        style={{ borderBottom: "1.5px solid var(--border-ink)", background: "var(--paper-bg)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/"
              style={{ fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)", fontSize: "12px", color: "var(--stamp-blue)", letterSpacing: "0.05em" }}
            >
              ← RADAR
            </Link>
            <h1
              style={{ fontFamily: "var(--font-dm-serif)", fontSize: "22px", letterSpacing: "0.1em", color: "var(--ink)", marginTop: "4px" }}
            >
              SETTINGS
            </h1>
          </div>
          {session?.user && (
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: "13px", color: "var(--ink-faint)" }}>{session.user.email}</p>
              <div className="flex items-center justify-end gap-2 mt-1">
                <span className="stamp-chip" style={{ color: planBadgeColor, fontSize: "10px" }}>
                  {(session.user.plan ?? "free").toUpperCase()}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  style={{ fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)", fontSize: "11px", color: "var(--ink-ghost)", background: "none", border: "none", cursor: "pointer", padding: 0, letterSpacing: "0.03em" }}
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="px-6 py-6 max-w-2xl space-y-8">

        {/* Error banner */}
        {error && (
          <div style={{ padding: "0.5rem 0.75rem", border: "1px solid var(--stamp-red)", color: "var(--stamp-red)", fontSize: "13px" }}>
            ✕ {error}
            <button onClick={() => setError(null)} style={{ marginLeft: "1rem", cursor: "pointer", opacity: 0.6 }}>dismiss</button>
          </div>
        )}

        {/* ── Categories ─────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 style={{ fontFamily: "var(--font-dm-serif)", fontSize: "14px", letterSpacing: "0.08em", color: "var(--ink)" }}>
                CATEGORIES
              </h2>
              <p style={{ fontSize: "12px", color: "var(--ink-ghost)", marginTop: "2px" }}>
                {categories.length} categor{categories.length !== 1 ? "ies" : "y"}
                {session?.user?.plan === "free" && ` · ${Math.max(0, 7 - categories.length)} remaining on free plan`}
              </p>
            </div>
            <button
              onClick={() => setAdding((p) => !p)}
              className="stamp-chip"
              style={{ color: "var(--stamp-blue)", fontSize: "11px", cursor: "pointer" }}
            >
              + ADD CATEGORY
            </button>
          </div>

          {/* Add form */}
          {adding && (
            <div
              style={{
                background: "var(--paper-surface)",
                border: "1.5px solid var(--border-ink)",
                padding: "1rem",
                marginBottom: "0.75rem",
                boxShadow: "2px 2px 0 rgba(0,0,0,0.06)",
              }}
            >
              <div className="flex gap-2">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Category name (e.g. Work, Personal, Side Projects)"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && createCategory()}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  onClick={createCategory}
                  disabled={creating || !newName.trim()}
                  className="typewriter-btn"
                  style={{ background: "var(--ink)", color: "var(--paper-surface)", borderColor: "var(--ink)", cursor: "pointer" }}
                >
                  {creating ? "Creating…" : "Create"}
                </button>
                <button
                  onClick={() => { setAdding(false); setNewName(""); }}
                  className="typewriter-btn"
                  style={{ cursor: "pointer" }}
                >
                  Cancel
                </button>
              </div>
              <p style={{ fontSize: "11px", color: "var(--ink-ghost)", marginTop: "0.5rem" }}>
                You can add subcategories after creating the category.
              </p>
            </div>
          )}

          {/* Category list */}
          {isLoading ? (
            <p style={{ fontSize: "13px", color: "var(--ink-ghost)", fontStyle: "italic" }}>Loading…</p>
          ) : categories.length === 0 ? (
            <div style={{ background: "var(--paper-surface)", border: "1.5px dashed var(--border-ink)", padding: "2rem", textAlign: "center" }}>
              <p style={{ fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)", fontSize: "15px", color: "var(--ink-ghost)", fontStyle: "italic" }}>
                No categories yet. Create your first one to get started.
              </p>
            </div>
          ) : (
            <div style={{ background: "var(--paper-surface)", border: "1px solid var(--border-ink)", boxShadow: "2px 2px 0 rgba(0,0,0,0.05)" }}>
              {categories.map((c) => (
                <CategoryRow key={c.id} category={c} onError={setError} />
              ))}
            </div>
          )}
        </section>

        {/* ── Slack Integration ───────────────────────────────── */}
        <Suspense fallback={null}>
          <SlackSection />
        </Suspense>

        {/* ── Weekly Digest ───────────────────────────────────── */}
        <section>
          <h2 style={{ fontFamily: "var(--font-dm-serif)", fontSize: "14px", letterSpacing: "0.08em", color: "var(--ink)", marginBottom: "0.5rem" }}>
            WEEKLY DIGEST
          </h2>
          <div style={{ background: "var(--paper-surface)", border: "1px solid var(--border-ink)", padding: "1rem 1.25rem", boxShadow: "2px 2px 0 rgba(0,0,0,0.05)" }}>
            <p style={{ fontSize: "13px", color: "var(--ink-faint)", lineHeight: "1.5" }}>
              Monday morning email with your open P0s, P1s, and task counts by category.
              Sent at 9AM in your local timezone.
            </p>
            <p style={{ fontSize: "11px", color: "var(--ink-ghost)", marginTop: "0.5rem", fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)", fontStyle: "italic" }}>
              On by default · unsubscribe coming soon
            </p>
          </div>
        </section>

        {/* ── Preferences ─────────────────────────────────────── */}
        <PreferencesSection />

        {/* ── Danger Zone ─────────────────────────────────────── */}
        <section>
          <h2 style={{ fontFamily: "var(--font-dm-serif)", fontSize: "14px", letterSpacing: "0.08em", color: "var(--stamp-red)", marginBottom: "0.5rem" }}>
            DANGER ZONE
          </h2>
          <div style={{ background: "var(--paper-surface)", border: "1px solid var(--stamp-red)", padding: "1rem 1.25rem" }}>
            <p style={{ fontSize: "13px", color: "var(--ink-faint)", marginBottom: "0.75rem" }}>
              Permanently delete your account and all data. This cannot be undone.
            </p>
            <button
              onClick={() => alert("Account deletion coming soon. Email support to request removal.")}
              style={{
                fontFamily:    "var(--font-inter, 'Inter', system-ui, sans-serif)",
                fontSize:      "12px",
                letterSpacing: "0.05em",
                color:         "var(--stamp-red)",
                border:        "1px solid var(--stamp-red)",
                background:    "transparent",
                padding:       "0.4rem 0.9rem",
                cursor:        "pointer",
              }}
            >
              Delete account
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
