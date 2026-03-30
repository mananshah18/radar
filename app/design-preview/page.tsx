"use client";

import { JetBrains_Mono, DM_Serif_Display, Inter, Space_Grotesk, Space_Mono } from "next/font/google";
import { useState } from "react";

const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jb" });
const dmSerif = DM_Serif_Display({ weight: "400", subsets: ["latin"], variable: "--font-dm-serif" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });
const spaceMono = Space_Mono({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-space-mono" });

// ─── Mock Data ───────────────────────────────────────────────────────────────

const TASKS = [
  { id: "1", title: "Fix crash on onboarding screen before demo", priority: "P0", effort: "Quick", area: "iOS App", status: "In Progress", due: "Today" },
  { id: "2", title: "Sync with design team on new nav patterns", priority: "P0", effort: "Quick", area: "Platform", status: "Todo", due: null },
  { id: "3", title: "Write Q2 roadmap doc for board review", priority: "P1", effort: "Deep", area: "Strategy", status: "Todo", due: "Thu" },
  { id: "4", title: "Review design specs for new dashboard", priority: "P2", effort: "Medium", area: "Charts", status: "Todo", due: null },
  { id: "5", title: "Update API error messages to be user-facing", priority: "P2", effort: "Quick", area: "Platform", status: "Waiting On", due: null },
  { id: "6", title: "Research competitor pricing changes", priority: "P3", effort: "Medium", area: "Growth", status: "Todo", due: null },
  { id: "7", title: "Refactor notification service", priority: "P3", effort: "Deep", area: "Platform", status: "Todo", due: null },
];

const COLUMNS = [
  { key: "P0", label: "Today", sub: "Urgent & blocking" },
  { key: "P1", label: "This Week", sub: "Has a deadline soon" },
  { key: "P2", label: "Sprint", sub: "Planned & in progress" },
  { key: "P3", label: "Backlog", sub: "Someday / no rush" },
];

// ─── Nav ─────────────────────────────────────────────────────────────────────

function StickyNav() {
  const designs = [
    { id: "design-a", label: "A — Terminal", color: "#22D3EE" },
    { id: "design-b", label: "B — Minimal", color: "#C2410C" },
    { id: "design-c", label: "C — Signal", color: "#6366F1" },
  ];
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
      background: "#000", borderBottom: "1px solid #222",
      display: "flex", alignItems: "center", gap: "8px",
      padding: "10px 20px",
    }}>
      <span style={{ color: "#666", fontSize: "12px", fontFamily: "monospace", marginRight: "8px" }}>
        DESIGN PREVIEW —
      </span>
      {designs.map((d) => (
        <a key={d.id} href={`#${d.id}`} style={{
          color: d.color, fontSize: "12px", fontFamily: "monospace",
          textDecoration: "none", padding: "4px 12px",
          border: `1px solid ${d.color}`, borderRadius: "2px",
          opacity: 0.8,
        }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "0.8")}
        >
          {d.label}
        </a>
      ))}
      <span style={{ marginLeft: "auto", color: "#444", fontSize: "11px", fontFamily: "monospace" }}>
        Pick one → I&apos;ll implement it fully
      </span>
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DESIGN A — TERMINAL
// ═══════════════════════════════════════════════════════════════════════════════

const A = {
  bg: "#0A0A0F",
  surface: "#0F0F18",
  surfaceHover: "#161622",
  border: "#1E1E30",
  borderBright: "#2A2A40",
  text: "#E2E8F0",
  textMuted: "#4A5568",
  textDim: "#2D3748",
  accent: "#22D3EE",
  p0: "#F87171",
  p1: "#FB923C",
  p2: "#22D3EE",
  p3: "#475569",
};

function ACard({ task }: { task: typeof TASKS[0] }) {
  const [hovered, setHovered] = useState(false);
  const color = task.priority === "P0" ? A.p0 : task.priority === "P1" ? A.p1 : task.priority === "P2" ? A.p2 : A.p3;
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? A.surfaceHover : A.surface,
        borderLeft: `2px solid ${color}`,
        borderTop: `1px solid ${A.border}`,
        borderRight: `1px solid ${A.border}`,
        borderBottom: `1px solid ${A.border}`,
        padding: "10px 14px",
        cursor: "pointer",
        transition: "background 0.1s",
        fontFamily: "var(--font-jb)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
        <span style={{ color, fontSize: "11px", flexShrink: 0, marginTop: "1px" }}>▸</span>
        <span style={{ color: A.text, fontSize: "12px", lineHeight: "1.5", flex: 1 }}>{task.title}</span>
      </div>
      <div style={{ display: "flex", gap: "8px", marginTop: "7px", alignItems: "center" }}>
        <span style={{
          color, fontSize: "10px", fontWeight: 700,
          border: `1px solid ${color}`, padding: "1px 5px", opacity: 0.8,
        }}>[{task.priority}]</span>
        <span style={{ color: A.textMuted, fontSize: "10px" }}>{task.effort.toLowerCase()}</span>
        <span style={{ color: A.textMuted, fontSize: "10px" }}>·</span>
        <span style={{ color: A.textMuted, fontSize: "10px" }}>{task.area.toLowerCase().replace(" ", "-")}</span>
        {task.status === "In Progress" && (
          <span style={{ color: A.accent, fontSize: "10px", marginLeft: "auto" }}>running</span>
        )}
        {task.status === "Waiting On" && (
          <span style={{ color: A.p1, fontSize: "10px", marginLeft: "auto" }}>blocked</span>
        )}
      </div>
    </div>
  );
}

function DesignA() {
  const colColor = (key: string) =>
    key === "P0" ? A.p0 : key === "P1" ? A.p1 : key === "P2" ? A.p2 : A.p3;

  return (
    <div className={jetbrainsMono.variable} style={{
      background: A.bg, minHeight: "100vh", display: "flex", flexDirection: "column",
      paddingTop: "44px",
    }}>
      {/* Header */}
      <div style={{
        borderBottom: `1px solid ${A.border}`,
        padding: "16px 24px",
        display: "flex", alignItems: "center", gap: "16px",
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
            <span style={{ fontFamily: "var(--font-jb)", fontSize: "20px", fontWeight: 700, color: A.accent, letterSpacing: "0.1em" }}>
              RADAR
            </span>
            <span style={{ fontFamily: "var(--font-jb)", fontSize: "11px", color: A.textMuted }}>v1.0</span>
          </div>
          <div style={{ fontFamily: "var(--font-jb)", fontSize: "11px", color: A.textMuted, marginTop: "2px" }}>
            <span style={{ color: A.p0 }}>3</span> urgent &nbsp;·&nbsp;
            <span style={{ color: A.text }}>7</span> open &nbsp;·&nbsp;
            mon 30 mar
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
          {["--priority", "--areas", "--archive"].map(flag => (
            <button key={flag} style={{
              fontFamily: "var(--font-jb)", fontSize: "11px", color: A.textMuted,
              background: "transparent", border: `1px solid ${A.border}`,
              padding: "4px 10px", cursor: "pointer",
            }}>{flag}</button>
          ))}
        </div>
      </div>

      {/* Capture */}
      <div style={{
        borderBottom: `1px solid ${A.border}`,
        padding: "12px 24px",
        display: "flex", alignItems: "center", gap: "10px",
      }}>
        <span style={{ fontFamily: "var(--font-jb)", fontSize: "13px", color: A.accent }}>❯</span>
        <span style={{ fontFamily: "var(--font-jb)", fontSize: "13px", color: A.textMuted, flex: 1 }}>
          type anything — ai will classify it
          <span style={{ borderLeft: `2px solid ${A.accent}`, marginLeft: "2px", animation: "none" }}>&nbsp;</span>
        </span>
        <span style={{ fontFamily: "var(--font-jb)", fontSize: "11px", color: A.textMuted }}>⏎ add</span>
      </div>

      {/* Board */}
      <div style={{ flex: 1, display: "flex", gap: "0", overflow: "hidden" }}>
        {COLUMNS.map((col, i) => {
          const tasks = TASKS.filter(t => t.priority === col.key);
          const color = colColor(col.key);
          return (
            <div key={col.key} style={{
              flex: 1,
              borderRight: i < 3 ? `1px solid ${A.border}` : "none",
              display: "flex", flexDirection: "column",
              overflow: "hidden",
            }}>
              <div style={{
                padding: "12px 16px 10px",
                borderBottom: `1px solid ${A.border}`,
                display: "flex", alignItems: "center", gap: "8px",
              }}>
                <span style={{ fontFamily: "var(--font-jb)", fontSize: "11px", color, fontWeight: 700, letterSpacing: "0.08em" }}>
                  [{col.key}]
                </span>
                <span style={{ fontFamily: "var(--font-jb)", fontSize: "11px", color, letterSpacing: "0.06em" }}>
                  {col.label.toUpperCase()}
                </span>
                <span style={{ marginLeft: "auto", fontFamily: "var(--font-jb)", fontSize: "10px", color: A.textMuted }}>
                  {tasks.length > 0 ? `${tasks.length} task${tasks.length > 1 ? "s" : ""}` : "empty"}
                </span>
              </div>
              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
                {tasks.map(t => <ACard key={t.id} task={t} />)}
                {tasks.length === 0 && (
                  <div style={{ padding: "16px", fontFamily: "var(--font-jb)", fontSize: "11px", color: A.textDim }}>
                    // no tasks
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pick button */}
      <div style={{ position: "absolute", bottom: "24px", right: "24px" }}>
        <div style={{
          fontFamily: "var(--font-jb)", fontSize: "12px",
          background: A.accent, color: "#000",
          padding: "10px 20px", cursor: "pointer", fontWeight: 700,
        }}>
          PICK THIS DESIGN →
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DESIGN B — MINIMAL (Ink & Paper 2.0)
// ═══════════════════════════════════════════════════════════════════════════════

const B = {
  bg: "#F5F4F0",
  surface: "#FFFFFF",
  border: "#D8D6D0",
  borderLight: "#E4E2DC",
  text: "#111111",
  textMuted: "#4A4A4A",
  textGhost: "#8A8A8A",
  accent: "#B83A0A",
  p0: "#B83A0A",
  p1: "#B45309",
  p2: "#1D5A8A",
  p3: "#6B6B6B",
};

function BCard({ task }: { task: typeof TASKS[0] }) {
  const [hovered, setHovered] = useState(false);
  const dot = task.priority === "P0" ? B.p0 : task.priority === "P1" ? B.p1 : task.priority === "P2" ? B.p2 : B.p3;
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        border: `1px solid ${B.border}`,
        borderRadius: "6px",
        padding: "14px 16px",
        marginBottom: "8px",
        cursor: "pointer",
        background: hovered ? "#FDFCF9" : B.surface,
        transition: "background 0.15s, border-color 0.15s",
        borderColor: hovered ? B.textGhost : B.border,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
        <div style={{
          width: "8px", height: "8px", borderRadius: "50%",
          background: dot, flexShrink: 0, marginTop: "5px",
        }} />
        <div style={{ flex: 1 }}>
          <p style={{
            fontFamily: "var(--font-inter)", fontSize: "15px", color: B.text,
            lineHeight: "1.5", margin: 0, fontWeight: 450,
          }}>{task.title}</p>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "7px", flexWrap: "wrap" }}>
            <span style={{
              fontFamily: "var(--font-inter)", fontSize: "12px", color: B.textMuted,
              fontWeight: 500,
            }}>{task.area}</span>
            <span style={{ color: B.borderLight, fontSize: "12px" }}>·</span>
            <span style={{
              fontFamily: "var(--font-inter)", fontSize: "12px", color: B.textMuted,
            }}>{task.effort}</span>
            {task.status === "In Progress" && (
              <>
                <span style={{ color: B.borderLight, fontSize: "12px" }}>·</span>
                <span style={{ fontFamily: "var(--font-inter)", fontSize: "12px", color: B.p2, fontWeight: 500 }}>In progress</span>
              </>
            )}
            {task.status === "Waiting On" && (
              <>
                <span style={{ color: B.borderLight, fontSize: "12px" }}>·</span>
                <span style={{ fontFamily: "var(--font-inter)", fontSize: "12px", color: B.p1, fontWeight: 500 }}>Waiting on someone</span>
              </>
            )}
            {task.due && (
              <>
                <span style={{ color: B.borderLight, fontSize: "12px" }}>·</span>
                <span style={{ fontFamily: "var(--font-inter)", fontSize: "12px", color: B.p0, fontWeight: 500 }}>Due {task.due}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DesignB() {
  const dotColor = (key: string) =>
    key === "P0" ? B.p0 : key === "P1" ? B.p1 : key === "P2" ? B.p2 : B.p3;

  const dotBg = `radial-gradient(circle, #C8C6BE 1px, transparent 1px)`;

  return (
    <div className={`${dmSerif.variable} ${inter.variable}`} style={{
      background: B.bg,
      backgroundImage: dotBg,
      backgroundSize: "24px 24px",
      minHeight: "100vh", display: "flex", flexDirection: "column",
      paddingTop: "44px",
    }}>
      {/* Header */}
      <div style={{
        background: "rgba(245,244,240,0.95)",
        backdropFilter: "blur(8px)",
        borderBottom: `1px solid ${B.border}`,
        padding: "20px 36px",
        display: "flex", alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "16px" }}>
          <span style={{ fontFamily: "var(--font-dm-serif)", fontSize: "30px", color: B.text, letterSpacing: "-0.02em" }}>
            Radar
          </span>
          <span style={{ fontFamily: "var(--font-inter)", fontSize: "13px", color: B.textMuted }}>
            Monday, March 30
          </span>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-inter)", fontSize: "13px", color: B.accent, fontWeight: 600 }}>
            3 urgent
          </span>
          <span style={{ color: B.textGhost, fontSize: "14px" }}>·</span>
          <span style={{ fontFamily: "var(--font-inter)", fontSize: "13px", color: B.textMuted }}>
            7 open
          </span>
          <div style={{ width: "1px", height: "16px", background: B.border, margin: "0 8px" }} />
          {["Priority", "Areas"].map(label => (
            <button key={label} style={{
              fontFamily: "var(--font-inter)", fontSize: "12px", color: B.textMuted,
              background: "transparent", border: `1px solid ${B.border}`,
              padding: "5px 13px", borderRadius: "4px", cursor: "pointer",
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* Capture */}
      <div style={{
        background: "rgba(245,244,240,0.95)",
        backdropFilter: "blur(8px)",
        borderBottom: `1px solid ${B.border}`,
        padding: "16px 36px",
        display: "flex", alignItems: "center", gap: "14px",
      }}>
        <svg width="16" height="16" viewBox="0 0 14 14" fill="none" style={{ color: B.textMuted, flexShrink: 0 }}>
          <path d="M9.5 1.5L12.5 4.5L5 12H2V9L9.5 1.5Z" stroke="currentColor" strokeWidth="1.2" fill="none" />
        </svg>
        <span style={{
          fontFamily: "var(--font-inter)", fontSize: "15px", color: B.textGhost,
          fontStyle: "italic", flex: 1, borderBottom: `1px solid ${B.border}`, paddingBottom: "8px",
        }}>
          capture anything — AI will sort it into your areas…
        </span>
      </div>

      {/* Board */}
      <div style={{ flex: 1, display: "flex", gap: "0", overflow: "hidden" }}>
        {COLUMNS.map((col, i) => {
          const tasks = TASKS.filter(t => t.priority === col.key);
          const color = dotColor(col.key);
          return (
            <div key={col.key} style={{
              flex: 1,
              borderRight: i < 3 ? `1px solid ${B.border}` : "none",
              display: "flex", flexDirection: "column",
              padding: "0 20px",
              background: "rgba(255,255,255,0.45)",
            }}>
              <div style={{ padding: "22px 0 14px", borderBottom: `1px solid ${B.borderLight}` }}>
                <h2 style={{
                  fontFamily: "var(--font-dm-serif)", fontSize: "26px", color: B.text,
                  margin: 0, fontWeight: 400, letterSpacing: "-0.01em",
                }}>
                  {col.label.toLowerCase()}
                </h2>
                <p style={{
                  fontFamily: "var(--font-inter)", fontSize: "12px", color: B.textMuted,
                  margin: "5px 0 0", display: "flex", alignItems: "center", gap: "6px",
                }}>
                  <span style={{
                    display: "inline-block", width: "7px", height: "7px",
                    borderRadius: "50%", background: color,
                  }} />
                  {tasks.length > 0 ? `${tasks.length} task${tasks.length !== 1 ? "s" : ""}` : "clear"}
                  <span style={{ color: B.textGhost }}>·</span>
                  <span style={{ color: B.textGhost }}>{col.sub}</span>
                </p>
              </div>
              <div style={{ flex: 1, overflowY: "auto", paddingTop: "12px" }}>
                {tasks.map(t => <BCard key={t.id} task={t} />)}
                {tasks.length === 0 && (
                  <p style={{
                    fontFamily: "var(--font-inter)", fontSize: "14px",
                    color: B.textGhost, fontStyle: "italic", paddingTop: "16px",
                  }}>
                    nothing here
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pick button */}
      <div style={{ position: "absolute", bottom: "24px", right: "24px" }}>
        <div style={{
          fontFamily: "var(--font-inter)", fontSize: "14px", fontWeight: 600,
          background: B.accent, color: "#FFF",
          padding: "11px 22px", cursor: "pointer", borderRadius: "5px",
        }}>
          Pick this design →
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DESIGN C — SIGNAL (Dark Navy, Editorial)
// ═══════════════════════════════════════════════════════════════════════════════

const C = {
  bg: "#0F172A",
  surface: "#1E293B",
  surfaceHover: "#243447",
  surfaceRaised: "#263548",
  border: "#334155",
  borderBright: "#475569",
  text: "#F1F5F9",
  textMuted: "#94A3B8",
  textDim: "#475569",
  accent: "#6366F1",
  accentHover: "#818CF8",
  p0: "#EF4444",
  p1: "#F59E0B",
  p2: "#6366F1",
  p3: "#475569",
};

function CCard({ task }: { task: typeof TASKS[0] }) {
  const [hovered, setHovered] = useState(false);
  const color = task.priority === "P0" ? C.p0 : task.priority === "P1" ? C.p1 : task.priority === "P2" ? C.p2 : C.p3;
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? C.surfaceHover : C.surface,
        borderLeft: `3px solid ${color}`,
        border: `1px solid ${hovered ? C.borderBright : C.border}`,
        borderLeftWidth: "3px",
        borderLeftColor: color,
        borderRadius: "4px",
        padding: "11px 14px",
        cursor: "pointer",
        marginBottom: "6px",
        transition: "background 0.12s, border-color 0.12s",
        boxShadow: hovered ? `0 0 0 1px ${color}22, inset 3px 0 0 ${color}` : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
        <span style={{
          fontFamily: "var(--font-space-grotesk)", fontSize: "10px", fontWeight: 700,
          color, background: `${color}18`,
          border: `1px solid ${color}44`,
          padding: "2px 6px", borderRadius: "3px",
          flexShrink: 0, letterSpacing: "0.05em",
        }}>{task.priority}</span>
        <p style={{
          fontFamily: "var(--font-space-mono)", fontSize: "12px", color: C.text,
          lineHeight: "1.5", margin: 0, flex: 1,
        }}>{task.title}</p>
      </div>
      <div style={{ display: "flex", gap: "6px", marginTop: "8px", alignItems: "center" }}>
        <span style={{
          fontFamily: "var(--font-space-grotesk)", fontSize: "10px", color: C.textMuted,
          background: C.surfaceRaised, padding: "2px 8px", borderRadius: "100px",
        }}>{task.effort}</span>
        <span style={{
          fontFamily: "var(--font-space-grotesk)", fontSize: "10px", color: C.textMuted,
          background: C.surfaceRaised, padding: "2px 8px", borderRadius: "100px",
        }}>{task.area}</span>
        {task.due && (
          <span style={{
            fontFamily: "var(--font-space-grotesk)", fontSize: "10px", color: C.p0,
            background: `${C.p0}18`, padding: "2px 8px", borderRadius: "100px",
            marginLeft: "auto",
          }}>due {task.due}</span>
        )}
        {task.status === "Waiting On" && (
          <span style={{
            fontFamily: "var(--font-space-grotesk)", fontSize: "10px", color: C.p1,
            marginLeft: "auto",
          }}>⏸ blocked</span>
        )}
      </div>
    </div>
  );
}

function DesignC() {
  const colColor = (key: string) =>
    key === "P0" ? C.p0 : key === "P1" ? C.p1 : key === "P2" ? C.p2 : C.p3;

  return (
    <div className={`${spaceGrotesk.variable} ${spaceMono.variable}`} style={{
      background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column",
      paddingTop: "44px",
    }}>
      {/* Header */}
      <div style={{
        borderBottom: `1px solid ${C.border}`,
        padding: "14px 24px",
        display: "flex", alignItems: "center", gap: "20px",
      }}>
        <span style={{
          fontFamily: "var(--font-space-grotesk)", fontSize: "18px", fontWeight: 700,
          color: C.text, letterSpacing: "0.15em",
        }}>RADAR</span>
        <div style={{ height: "18px", width: "1px", background: C.border }} />
        <span style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "12px", color: C.textMuted }}>
          MON 30 MAR
        </span>
        <div style={{ display: "flex", gap: "12px", marginLeft: "auto", alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "12px", color: C.p0, fontWeight: 600 }}>
            ● 3 urgent
          </span>
          <span style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "12px", color: C.textMuted }}>
            7 open
          </span>
          {["Priority", "Areas", "Archive"].map(label => (
            <button key={label} style={{
              fontFamily: "var(--font-space-grotesk)", fontSize: "11px", color: C.textMuted,
              background: C.surface, border: `1px solid ${C.border}`,
              padding: "5px 12px", borderRadius: "4px", cursor: "pointer",
              letterSpacing: "0.03em",
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* Capture */}
      <div style={{
        borderBottom: `1px solid ${C.border}`,
        padding: "12px 24px",
        display: "flex", alignItems: "center", gap: "10px",
      }}>
        <div style={{
          flex: 1, display: "flex", alignItems: "center", gap: "10px",
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: "6px", padding: "8px 14px",
        }}>
          <span style={{ color: C.accent, fontSize: "13px" }}>+</span>
          <span style={{
            fontFamily: "var(--font-space-grotesk)", fontSize: "13px", color: C.textDim,
          }}>
            Capture a task — AI classifies it into your areas automatically
          </span>
          <span style={{
            marginLeft: "auto", fontFamily: "var(--font-space-grotesk)", fontSize: "10px",
            color: C.textDim, background: C.surfaceRaised,
            padding: "2px 8px", borderRadius: "3px",
          }}>⌘ K</span>
        </div>
      </div>

      {/* Board */}
      <div style={{ flex: 1, display: "flex", gap: "0", overflow: "hidden" }}>
        {COLUMNS.map((col, i) => {
          const tasks = TASKS.filter(t => t.priority === col.key);
          const color = colColor(col.key);
          return (
            <div key={col.key} style={{
              flex: 1,
              borderRight: i < 3 ? `1px solid ${C.border}` : "none",
              display: "flex", flexDirection: "column",
            }}>
              <div style={{
                borderTop: `3px solid ${color}`,
                padding: "14px 16px 10px",
                borderBottom: `1px solid ${C.border}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{
                    fontFamily: "var(--font-space-grotesk)", fontSize: "11px", fontWeight: 600,
                    color: C.textMuted, letterSpacing: "0.1em",
                  }}>
                    {col.label.toUpperCase()} · {tasks.length}
                  </span>
                  <span style={{ fontSize: "10px", color: color, opacity: 0.7 }}>●</span>
                </div>
                <p style={{
                  fontFamily: "var(--font-space-grotesk)", fontSize: "11px", color: C.textDim,
                  margin: "3px 0 0",
                }}>{col.sub}</p>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
                {tasks.map(t => <CCard key={t.id} task={t} />)}
                {tasks.length === 0 && (
                  <p style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "12px", color: C.textDim, fontStyle: "italic" }}>
                    Clear
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pick button */}
      <div style={{ position: "absolute", bottom: "24px", right: "24px" }}>
        <div style={{
          fontFamily: "var(--font-space-grotesk)", fontSize: "13px", fontWeight: 600,
          background: C.accent, color: "#FFF",
          padding: "10px 20px", cursor: "pointer", borderRadius: "6px",
          letterSpacing: "0.03em",
        }}>
          Pick this design →
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function DesignPreview() {
  return (
    <>
      <StickyNav />
      <section id="design-a" style={{ position: "relative", minHeight: "100vh" }}>
        <DesignA />
        <div style={{
          position: "absolute", top: "54px", left: "50%", transform: "translateX(-50%)",
          background: "#22D3EE", color: "#000", fontFamily: "monospace",
          fontSize: "11px", fontWeight: 700, padding: "4px 14px", letterSpacing: "0.08em",
          zIndex: 10,
        }}>
          A — TERMINAL
        </div>
      </section>
      <section id="design-b" style={{ position: "relative", minHeight: "100vh" }}>
        <DesignB />
        <div style={{
          position: "absolute", top: "54px", left: "50%", transform: "translateX(-50%)",
          background: "#C2410C", color: "#FFF", fontFamily: "sans-serif",
          fontSize: "11px", fontWeight: 700, padding: "4px 14px", letterSpacing: "0.08em",
          borderRadius: "2px", zIndex: 10,
        }}>
          B — MINIMAL
        </div>
      </section>
      <section id="design-c" style={{ position: "relative", minHeight: "100vh" }}>
        <DesignC />
        <div style={{
          position: "absolute", top: "54px", left: "50%", transform: "translateX(-50%)",
          background: "#6366F1", color: "#FFF", fontFamily: "sans-serif",
          fontSize: "11px", fontWeight: 700, padding: "4px 14px", letterSpacing: "0.08em",
          borderRadius: "2px", zIndex: 10,
        }}>
          C — SIGNAL
        </div>
      </section>
    </>
  );
}
