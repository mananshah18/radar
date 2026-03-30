"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type { Area } from "@/types/app";

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

function revalidateAreas() {
  mutate("/api/areas");
}

function AreaRow({ area, onDelete }: { area: Area; onDelete: (err: string) => void }) {
  const [editing,       setEditing]       = useState(false);
  const [form,          setForm]          = useState({ name: area.name, groupName: area.groupName });
  const [showGroup,     setShowGroup]     = useState(false);
  const [saving,        setSaving]        = useState(false);

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/areas/${area.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setEditing(false);
      revalidateAreas();
    }
  }

  async function deleteArea() {
    const res = await fetch(`/api/areas/${area.id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json() as { error?: string };
      onDelete(d.error ?? "Cannot delete area.");
    } else {
      revalidateAreas();
    }
  }

  async function setAsInbox() {
    await fetch(`/api/areas/${area.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ isInbox: true }),
    });
    revalidateAreas();
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2 py-2.5 px-4" style={{ borderBottom: "1px solid var(--border-light)" }}>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="Area name"
            style={{ ...inputStyle, flex: 1, minWidth: "120px" }}
            autoFocus
          />
          <button
            onClick={save}
            disabled={saving}
            style={{ ...inputStyle, color: "var(--stamp-blue)", cursor: "pointer", background: "transparent" }}
          >
            {saving ? "…" : "Save"}
          </button>
          <button
            onClick={() => setEditing(false)}
            style={{ ...inputStyle, color: "var(--ink-ghost)", cursor: "pointer", background: "transparent", border: "none" }}
          >
            Cancel
          </button>
        </div>
        {showGroup ? (
          <input
            value={form.groupName}
            onChange={(e) => setForm((p) => ({ ...p, groupName: e.target.value }))}
            placeholder="Group name (e.g. Work, Personal)"
            style={{ ...inputStyle, fontSize: "12px" }}
          />
        ) : (
          <button
            onClick={() => setShowGroup(true)}
            style={{ fontSize: "11px", color: "var(--ink-ghost)", cursor: "pointer", textAlign: "left", background: "none", border: "none" }}
          >
            + set group <span style={{ opacity: 0.5 }}>(currently: {form.groupName})</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 py-2.5 px-4 group" style={{ borderBottom: "1px solid var(--border-light)" }}>
      {area.isInbox && (
        <span className="stamp-chip" style={{ color: "var(--stamp-blue)", fontSize: "10px" }}>📥 Inbox</span>
      )}
      <span style={{ flex: 1, fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)", fontSize: "13px", color: "var(--ink)" }}>
        {area.name}
      </span>
      <span style={{ fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)", fontSize: "11px", color: "var(--ink-ghost)" }}>
        {area.groupName}
      </span>
      <span style={{ fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)", fontSize: "11px", color: "var(--ink-ghost)" }}>
        {area.taskCount ?? 0} tasks
      </span>
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {!area.isInbox && (
          <button
            onClick={setAsInbox}
            style={{ fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)", fontSize: "11px", color: "var(--ink-ghost)", cursor: "pointer" }}
          >
            Set inbox
          </button>
        )}
        <button
          onClick={() => setEditing(true)}
          style={{ fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)", fontSize: "11px", color: "var(--ink-faint)", cursor: "pointer" }}
        >
          Edit
        </button>
        <button
          onClick={deleteArea}
          style={{ fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)", fontSize: "11px", color: "var(--stamp-red)", cursor: "pointer" }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const { data: areas = [], isLoading } = useSWR<Area[]>("/api/areas", fetcher);
  const [adding,    setAdding]    = useState(false);
  const [newForm,   setNewForm]   = useState({ name: "", groupName: "General" });
  const [showGroup, setShowGroup] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [creating,  setCreating]  = useState(false);

  // Group areas
  const grouped: Record<string, Area[]> = {};
  for (const a of areas) {
    if (!grouped[a.groupName]) grouped[a.groupName] = [];
    grouped[a.groupName].push(a);
  }

  async function createArea() {
    if (!newForm.name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/areas", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(newForm),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error ?? "Failed to create area."); return; }
      setNewForm({ name: "", groupName: "General" });
      setAdding(false);
      revalidateAreas();
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
              <span className="stamp-chip" style={{ color: planBadgeColor, fontSize: "10px" }}>
                {(session.user.plan ?? "free").toUpperCase()}
              </span>
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

        {/* ── Areas ──────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 style={{ fontFamily: "var(--font-dm-serif)", fontSize: "14px", letterSpacing: "0.08em", color: "var(--ink)" }}>
                AREAS
              </h2>
              <p style={{ fontSize: "12px", color: "var(--ink-ghost)", marginTop: "2px" }}>
                {areas.length} area{areas.length !== 1 ? "s" : ""}
                {session?.user?.plan === "free" && ` · ${Math.max(0, 7 - areas.length)} remaining on free plan`}
              </p>
            </div>
            <button
              onClick={() => setAdding((p) => !p)}
              className="stamp-chip"
              style={{ color: "var(--stamp-blue)", fontSize: "11px", cursor: "pointer" }}
            >
              + ADD AREA
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
              <div className="flex gap-2 flex-wrap mb-2">
                <input
                  value={newForm.name}
                  onChange={(e) => setNewForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Area name (e.g. Product, Marketing, Personal)"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && createArea()}
                  style={{ ...inputStyle, flex: 1, minWidth: "200px" }}
                />
                <button
                  onClick={createArea}
                  disabled={creating || !newForm.name.trim()}
                  className="typewriter-btn"
                  style={{ background: "var(--ink)", color: "var(--paper-surface)", borderColor: "var(--ink)", cursor: "pointer" }}
                >
                  {creating ? "Creating…" : "Create"}
                </button>
                <button
                  onClick={() => { setAdding(false); setShowGroup(false); }}
                  className="typewriter-btn"
                  style={{ cursor: "pointer" }}
                >
                  Cancel
                </button>
              </div>
              {showGroup ? (
                <input
                  value={newForm.groupName}
                  onChange={(e) => setNewForm((p) => ({ ...p, groupName: e.target.value }))}
                  placeholder="Group name (e.g. Work, Personal, Side Projects)"
                  style={{ ...inputStyle, width: "100%", fontSize: "12px" }}
                />
              ) : (
                <button
                  onClick={() => setShowGroup(true)}
                  style={{ fontSize: "11px", color: "var(--ink-ghost)", cursor: "pointer", background: "none", border: "none" }}
                >
                  + add to a group <span style={{ opacity: 0.5 }}>(optional — helps organise multiple areas)</span>
                </button>
              )}
            </div>
          )}

          {/* Area list */}
          {isLoading ? (
            <p style={{ fontSize: "13px", color: "var(--ink-ghost)", fontStyle: "italic", fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)" }}>
              Loading areas…
            </p>
          ) : areas.length === 0 ? (
            <div
              style={{
                background: "var(--paper-surface)",
                border: "1.5px dashed var(--border-ink)",
                padding: "2rem",
                textAlign: "center",
              }}
            >
              <p style={{ fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)", fontSize: "15px", color: "var(--ink-ghost)", fontStyle: "italic" }}>
                No areas yet. Create your first area to get started.
              </p>
            </div>
          ) : (
            <div style={{ background: "var(--paper-surface)", border: "1px solid var(--border-ink)", boxShadow: "2px 2px 0 rgba(0,0,0,0.05)" }}>
              {Object.entries(grouped).map(([group, groupAreas]) => (
                <div key={group}>
                  <div
                    style={{
                      padding: "0.3rem 1rem",
                      background: "var(--paper-dark)",
                      borderBottom: "1px solid var(--border-light)",
                      fontSize: "10px",
                      letterSpacing: "0.1em",
                      color: "var(--ink-ghost)",
                    }}
                  >
                    {group.toUpperCase()}
                  </div>
                  {groupAreas.map((a) => (
                    <AreaRow key={a.id} area={a} onDelete={setError} />
                  ))}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Weekly Digest ───────────────────────────────────── */}
        <section>
          <h2 style={{ fontFamily: "var(--font-dm-serif)", fontSize: "14px", letterSpacing: "0.08em", color: "var(--ink)", marginBottom: "0.5rem" }}>
            WEEKLY DIGEST
          </h2>
          <div
            style={{
              background: "var(--paper-surface)",
              border: "1px solid var(--border-ink)",
              padding: "1rem 1.25rem",
              boxShadow: "2px 2px 0 rgba(0,0,0,0.05)",
            }}
          >
            <p style={{ fontSize: "13px", color: "var(--ink-faint)", lineHeight: "1.5" }}>
              Monday morning email with your open P0s, P1s, and task counts by area.
              Sent at 9AM in your local timezone.
            </p>
            <p style={{ fontSize: "11px", color: "var(--ink-ghost)", marginTop: "0.5rem", fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)", fontStyle: "italic" }}>
              On by default · unsubscribe coming soon
            </p>
          </div>
        </section>

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
                fontFamily:   "var(--font-inter, 'Inter', system-ui, sans-serif)",
                fontSize:     "12px",
                letterSpacing:"0.05em",
                color:        "var(--stamp-red)",
                border:       "1px solid var(--stamp-red)",
                background:   "transparent",
                padding:      "0.4rem 0.9rem",
                cursor:       "pointer",
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
