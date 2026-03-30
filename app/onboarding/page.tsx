"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface AreaTemplate {
  name: string;
  groupName: string;
  isInbox?: boolean;
}

interface Template {
  icon:  string;
  label: string;
  areas: AreaTemplate[];
}

const TEMPLATES: Template[] = [
  {
    icon:  "🚀",
    label: "Startup Founder",
    areas: [
      { name: "Inbox",      groupName: "General",   isInbox: true },
      { name: "Product",    groupName: "Build"                    },
      { name: "GTM",        groupName: "Build"                    },
      { name: "Fundraising",groupName: "Business"                 },
      { name: "Ops & Hiring",groupName:"Business"                 },
    ],
  },
  {
    icon:  "🔧",
    label: "Product & Engineering",
    areas: [
      { name: "Inbox",      groupName: "General", isInbox: true },
      { name: "Core Platform", groupName: "Engineering"         },
      { name: "Mobile",        groupName: "Engineering"         },
      { name: "Product Strategy",groupName:"Product"            },
      { name: "Cross-team",    groupName: "Product"             },
    ],
  },
  {
    icon:  "🎯",
    label: "Marketing & Growth",
    areas: [
      { name: "Inbox",     groupName: "General", isInbox: true },
      { name: "Content",   groupName: "Growth"                 },
      { name: "Campaigns", groupName: "Growth"                 },
      { name: "Analytics", groupName: "Growth"                 },
      { name: "Brand",     groupName: "Growth"                 },
    ],
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // #28 — show errors instead of silently failing
  async function applyTemplate(areas: AreaTemplate[]) {
    setLoading(true);
    setError(null);
    try {
      for (const area of areas) {
        const res = await fetch("/api/areas", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(area),
        });
        if (!res.ok) {
          const d = await res.json() as { error?: string };
          throw new Error(d.error ?? "Failed to create area");
        }
      }
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  async function startBlank() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/areas", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: "Inbox", groupName: "General", isInbox: true }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        throw new Error(d.error ?? "Failed to create inbox");
      }
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--paper-bg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
      fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)",
    }}>
      <div style={{ width: "100%", maxWidth: "580px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{
            fontFamily: "var(--font-dm-serif)",
            fontSize: "2rem",
            letterSpacing: "0.15em",
            color: "var(--ink)",
            marginBottom: "0.5rem",
          }}>
            RADAR
          </div>
          <h2 style={{
            fontFamily: "var(--font-dm-serif)",
            fontSize: "1.1rem",
            letterSpacing: "0.08em",
            color: "var(--ink)",
            marginBottom: "0.5rem",
          }}>
            SET UP YOUR WORKSPACE
          </h2>
          <p style={{
            fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)",
            fontSize: "1.05rem",
            color: "var(--ink-faint)",
            fontStyle: "italic",
          }}>
            Pick a starter — you can change everything later.
          </p>
          <div style={{ marginTop: "1.25rem", borderBottom: "1px solid var(--border-ink)" }} />
        </div>

        {/* Error */}
        {error && (
          <div style={{ marginBottom: "1rem", padding: "0.5rem 0.75rem", border: "1px solid var(--stamp-red)", color: "var(--stamp-red)", fontSize: "0.8rem", fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)" }}>
            ✕ {error}
          </div>
        )}

        {/* Template cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }}>
          {TEMPLATES.map((t, i) => {
            const isSelected = selected === i;
            return (
              <div
                key={i}
                onClick={() => { if (!loading) setSelected(i); }}
                style={{
                  background:  isSelected ? "var(--paper-dark)" : "var(--paper-surface)",
                  border:      `1.5px solid ${isSelected ? "var(--ink)" : "var(--border-ink)"}`,
                  boxShadow:   isSelected ? "3px 3px 0 rgba(0,0,0,0.1)" : "2px 2px 0 rgba(0,0,0,0.05)",
                  padding:     "1rem 1.25rem",
                  cursor:      loading ? "not-allowed" : "pointer",
                  transition:  "all 0.1s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <span style={{ fontSize: "1.1rem", marginRight: "0.5rem" }}>{t.icon}</span>
                    <span style={{
                      fontFamily: "var(--font-dm-serif)",
                      fontSize: "0.9rem",
                      letterSpacing: "0.06em",
                      color: "var(--ink)",
                    }}>
                      {t.label.toUpperCase()}
                    </span>
                  </div>
                  {isSelected && (
                    <span style={{
                      fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)",
                      fontSize: "10px",
                      color: "var(--paper-surface)",
                      background: "var(--ink)",
                      padding: "2px 7px",
                      letterSpacing: "0.1em",
                    }}>
                      SELECTED
                    </span>
                  )}
                </div>

                {/* Area preview */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.6rem" }}>
                  {t.areas.map((a) => (
                    <span
                      key={a.name}
                      className="stamp-chip"
                      style={{ color: a.isInbox ? "var(--stamp-blue)" : "var(--ink-faint)", fontSize: "10px" }}
                    >
                      {a.isInbox ? "📥 " : ""}{a.name}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={() => selected !== null && applyTemplate(TEMPLATES[selected].areas)}
            disabled={selected === null || loading}
            className="typewriter-btn"
            style={{
              flex: 1,
              padding: "0.7rem",
              background: selected !== null ? "var(--ink)" : "transparent",
              color: selected !== null ? "var(--paper-surface)" : "var(--ink-ghost)",
              borderColor: selected !== null ? "var(--ink)" : "var(--border-ink)",
              fontFamily: "var(--font-dm-serif)",
              fontSize: "0.9rem",
              letterSpacing: "0.1em",
              cursor: selected === null || loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "SETTING UP…" : "USE THIS TEMPLATE"}
          </button>

          <button
            onClick={startBlank}
            disabled={loading}
            className="typewriter-btn"
            style={{
              padding: "0.7rem 1.25rem",
              fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)",
              fontSize: "0.8rem",
              letterSpacing: "0.06em",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            Start blank
          </button>
        </div>

        <p style={{
          marginTop: "1.5rem",
          textAlign: "center",
          fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)",
          fontSize: "0.9rem",
          color: "var(--ink-ghost)",
          fontStyle: "italic",
        }}>
          Add your first task — AI will sort it for you.
        </p>
      </div>
    </div>
  );
}
