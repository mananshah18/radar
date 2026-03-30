import Link from "next/link";

export const metadata = { title: "Learn · Radar" };

/* ── Mini mockup components ──────────────────────────────── */

function PriorityDot({ color }: { color: string }) {
  return (
    <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
  );
}

function MockCard({
  title,
  meta,
  dotColor,
  done,
}: {
  title: string;
  meta?: string;
  dotColor: string;
  done?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        padding: "10px 13px",
        background: "var(--paper-surface)",
        border: "1px solid var(--border-ink)",
        borderRadius: 6,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <PriorityDot color={dotColor} />
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: 2,
          border: `1.5px solid ${done ? dotColor : "var(--border-ink)"}`,
          background: done ? dotColor : "transparent",
          flexShrink: 0,
          marginTop: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {done && (
          <svg width="7" height="7" viewBox="0 0 9 9" fill="none">
            <path d="M1.5 4.5l2 2 4-4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <div style={{ flex: 1 }}>
        <p
          style={{
            fontSize: 13,
            color: done ? "var(--ink-ghost)" : "var(--ink)",
            textDecoration: done ? "line-through" : "none",
            fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)",
            fontWeight: 450,
          }}
        >
          {title}
        </p>
        {meta && (
          <p style={{ fontSize: 11, color: "var(--ink-ghost)", marginTop: 3, fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)" }}>
            {meta}
          </p>
        )}
      </div>
    </div>
  );
}

function MockColumn({
  label,
  color,
  sub,
  cards,
}: {
  label: string;
  color: string;
  sub: string;
  cards: React.ReactNode;
}) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 160,
        background: "rgba(255,255,255,0.5)",
        border: "1px solid var(--border-ink)",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "12px 14px 10px", borderBottom: "1px solid var(--border-light)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
          <PriorityDot color={color} />
          <span style={{ fontFamily: "var(--font-dm-serif)", fontSize: 15, color: "var(--ink)" }}>{label}</span>
        </div>
        <p style={{ fontSize: 11, color: "var(--ink-ghost)", paddingLeft: 15, fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)" }}>{sub}</p>
      </div>
      <div style={{ padding: "10px 10px", display: "flex", flexDirection: "column", gap: 7 }}>
        {cards}
      </div>
    </div>
  );
}

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 9px",
        border: `1px solid ${color}`,
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 500,
        color,
        fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)",
        background: "transparent",
      }}
    >
      {label}
    </span>
  );
}

/* ── Section layout helpers ──────────────────────────────── */

function Section({
  children,
  alt,
}: {
  children: React.ReactNode;
  alt?: boolean;
}) {
  return (
    <section
      style={{
        background: alt ? "var(--paper-surface)" : "transparent",
        borderTop: "1px solid var(--border-light)",
        padding: "80px 0",
      }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 40px" }}>
        {children}
      </div>
    </section>
  );
}

function FeatureLayout({
  label,
  labelColor,
  headline,
  body,
  visual,
  reverse,
}: {
  label: string;
  labelColor: string;
  headline: string;
  body: string;
  visual: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 48,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 60,
          alignItems: "center",
        }}
        className={reverse ? "feature-reverse" : ""}
      >
        <div style={{ order: reverse ? 2 : 1 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: labelColor,
              fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)",
            }}
          >
            {label}
          </span>
          <h2
            style={{
              fontFamily: "var(--font-dm-serif)",
              fontSize: 34,
              color: "var(--ink)",
              lineHeight: 1.15,
              marginTop: 10,
              marginBottom: 18,
              letterSpacing: "-0.01em",
            }}
          >
            {headline}
          </h2>
          <p
            style={{
              fontSize: 15,
              color: "var(--ink-faint)",
              lineHeight: 1.7,
              fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)",
            }}
          >
            {body}
          </p>
        </div>
        <div style={{ order: reverse ? 1 : 2 }}>
          {visual}
        </div>
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────── */

export default function LearnPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--paper-bg)" }}>

      {/* Nav */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "rgba(245,244,240,0.92)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid var(--border-ink)",
          padding: "0 40px",
          height: 52,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-dm-serif)",
            fontSize: 20,
            color: "var(--ink)",
            textDecoration: "none",
            letterSpacing: "-0.01em",
          }}
        >
          Radar
        </Link>
        <Link href="/" className="typewriter-btn">
          Open app →
        </Link>
      </nav>

      {/* Hero */}
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "100px 40px 80px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--stamp-blue)",
            marginBottom: 18,
            fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)",
          }}
        >
          How Radar works
        </p>
        <h1
          style={{
            fontFamily: "var(--font-dm-serif)",
            fontSize: "clamp(38px, 6vw, 60px)",
            color: "var(--ink)",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            marginBottom: 24,
          }}
        >
          Built for the way
          <br />
          you actually work
        </h1>
        <p
          style={{
            fontSize: 17,
            color: "var(--ink-faint)",
            maxWidth: 520,
            margin: "0 auto 40px",
            lineHeight: 1.7,
            fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)",
          }}
        >
          Capture anything. AI sorts it. You ship it.
          No setup, no taxonomy debates, no stale to-do lists.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/signup"
            style={{
              padding: "10px 24px",
              background: "var(--ink)",
              color: "var(--paper-surface)",
              border: "1.5px solid var(--ink)",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)",
              textDecoration: "none",
              letterSpacing: "0.01em",
            }}
          >
            Get started free
          </Link>
          <Link href="/" className="typewriter-btn" style={{ padding: "10px 20px" }}>
            Open my board
          </Link>
        </div>
      </div>

      {/* ── Feature 1: Quick Capture ── */}
      <Section alt>
        <FeatureLayout
          label="Quick Capture"
          labelColor="var(--stamp-blue)"
          headline="Type it. Done. AI figures out the rest."
          body="The capture bar lives at the top of every page. Type anything — a raw thought, a Slack message you copy-pasted, a half-formed idea. Hit enter. Radar rewrites it as a clean action item and files it automatically."
          visual={
            <div
              style={{
                background: "var(--paper-bg)",
                border: "1px solid var(--border-ink)",
                borderRadius: 10,
                padding: "20px 24px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.07)",
              }}
            >
              {/* Capture bar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  borderBottom: "1.5px solid var(--border-ink)",
                  paddingBottom: 12,
                  marginBottom: 20,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: "var(--ink-ghost)", flexShrink: 0 }}>
                  <path d="M11.5 1.5L14.5 4.5L5 14H2V11L11.5 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9.5 3.5L12.5 6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span
                  style={{
                    flex: 1,
                    fontSize: 13,
                    color: "var(--ink)",
                    fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)",
                  }}
                >
                  follow up with design team re launch assets
                </span>
                <span
                  style={{
                    padding: "2px 9px",
                    border: "1px solid var(--stamp-blue)",
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 500,
                    color: "var(--stamp-blue)",
                    fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)",
                  }}
                >
                  ADD
                </span>
              </div>
              {/* Result */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <p style={{ fontSize: 11, color: "var(--ink-ghost)", marginBottom: 4, fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)", fontStyle: "italic" }}>
                  → Filed under GTM · P1 · Quick
                </p>
                <MockCard
                  title="Follow up with design team re launch assets"
                  meta="GTM · quick · this week"
                  dotColor="var(--stamp-amber)"
                />
              </div>
            </div>
          }
        />
      </Section>

      {/* ── Feature 2: Priority Board ── */}
      <Section>
        <FeatureLayout
          label="Priority Board"
          labelColor="var(--stamp-red)"
          headline="Four columns. One question answered."
          body="Today, This Week, Sprint, Backlog — that's it. Every task lives in exactly one column. Open Radar in the morning and you immediately know what to work on. No digging, no sorting, no decision fatigue."
          reverse
          visual={
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              <MockColumn
                label="Today"
                color="var(--stamp-red)"
                sub="Drop everything"
                cards={
                  <>
                    <MockCard title="Fix auth regression on staging" dotColor="var(--stamp-red)" meta="Engineering · deep" />
                    <MockCard title="Unblock iOS build pipeline" dotColor="var(--stamp-red)" meta="Engineering · quick" done />
                  </>
                }
              />
              <MockColumn
                label="This Week"
                color="var(--stamp-amber)"
                sub="Ship by Friday"
                cards={
                  <>
                    <MockCard title="Review Q2 roadmap with stakeholders" dotColor="var(--stamp-amber)" meta="Product · medium" />
                    <MockCard title="Write launch blog post" dotColor="var(--stamp-amber)" meta="GTM · deep" />
                  </>
                }
              />
            </div>
          }
        />
      </Section>

      {/* ── Feature 3: AI Classification ── */}
      <Section alt>
        <FeatureLayout
          label="AI Classification"
          labelColor="var(--stamp-green)"
          headline="Your areas. AI's job to fill them."
          body="You define your work streams — the things that matter to you. Radar learns them and routes every new task automatically. Wrong area? One click to change it. The AI gets better context as your areas grow."
          visual={
            <div
              style={{
                background: "var(--paper-bg)",
                border: "1px solid var(--border-ink)",
                borderRadius: 10,
                padding: "20px 24px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.07)",
              }}
            >
              {[
                { raw: "prep for investor call next week", area: "Fundraising", p: "P1", e: "Medium", aColor: "var(--stamp-amber)" },
                { raw: "fix crash on Android 14",          area: "Mobile",       p: "P0", e: "Deep",   aColor: "var(--stamp-red)"   },
                { raw: "update onboarding copy",           area: "GTM",          p: "P2", e: "Quick",  aColor: "var(--stamp-blue)"  },
              ].map((item) => (
                <div key={item.raw} style={{ marginBottom: 14 }}>
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--ink-ghost)",
                      fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)",
                      fontStyle: "italic",
                      marginBottom: 5,
                    }}
                  >
                    "{item.raw}"
                  </p>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ color: "var(--ink-ghost)" }}>
                      <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <Chip label={item.area} color={item.aColor} />
                    <Chip label={item.p} color={item.aColor} />
                    <Chip label={item.e} color="var(--ink-ghost)" />
                  </div>
                </div>
              ))}
            </div>
          }
        />
      </Section>

      {/* ── Feature 4: Area View ── */}
      <Section>
        <FeatureLayout
          label="Area View"
          labelColor="var(--stamp-blue)"
          headline="Weekly review, not weekly dread."
          body="Toggle to Area View and see every work stream side by side. Great for Monday planning — understand where tasks are piling up, what's blocked, and what needs attention across all your projects at once."
          reverse
          visual={
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { name: "Core Platform", group: "Engineering", tasks: 4, color: "var(--stamp-red)" },
                { name: "GTM",           group: "Growth",       tasks: 2, color: "var(--stamp-amber)" },
                { name: "Fundraising",   group: "Business",     tasks: 6, color: "var(--stamp-blue)" },
              ].map((area) => (
                <div
                  key={area.name}
                  style={{
                    background: "rgba(255,255,255,0.5)",
                    border: "1px solid var(--border-ink)",
                    borderRadius: 8,
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <PriorityDot color={area.color} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontFamily: "var(--font-dm-serif)", color: "var(--ink)" }}>{area.name}</p>
                    <p style={{ fontSize: 11, color: "var(--ink-ghost)", fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)" }}>{area.group}</p>
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: "var(--ink-ghost)",
                      fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)",
                    }}
                  >
                    {area.tasks} open
                  </span>
                </div>
              ))}
            </div>
          }
        />
      </Section>

      {/* ── Feature 5: Task Detail ── */}
      <Section alt>
        <FeatureLayout
          label="Task Detail"
          labelColor="var(--stamp-gray)"
          headline="Every task can hold the full picture."
          body="Click any task to expand it. Add notes, links, and context. Set a due date — overdue tasks turn red so nothing slips. Change priority, effort, status, or area without leaving the board. Everything saves instantly."
          visual={
            <div
              style={{
                background: "var(--paper-surface)",
                border: "1px solid var(--border-ink)",
                borderRadius: 10,
                overflow: "hidden",
                boxShadow: "0 4px 20px rgba(0,0,0,0.07)",
              }}
            >
              {/* Card header */}
              <div style={{ padding: "13px 15px", borderBottom: "1px solid var(--border-ink)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <PriorityDot color="var(--stamp-amber)" />
                  <div style={{ width: 14, height: 14, borderRadius: 2, border: "1.5px solid var(--border-ink)", marginTop: 1, flexShrink: 0 }} />
                  <p style={{ fontSize: 14, fontWeight: 450, color: "var(--ink)", fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)" }}>
                    Review Q2 roadmap with stakeholders
                  </p>
                </div>
                <p style={{ fontSize: 11, color: "var(--ink-ghost)", paddingLeft: 30, marginTop: 5, fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)" }}>
                  Product · medium · apr 4
                </p>
              </div>
              {/* Detail panel */}
              <div style={{ padding: "14px 15px", background: "var(--paper-bg)", display: "flex", flexDirection: "column", gap: 10 }}>
                <div
                  style={{
                    background: "var(--paper-surface)",
                    border: "1px solid var(--border-ink)",
                    borderRadius: 5,
                    padding: "7px 10px",
                    fontSize: 12,
                    color: "var(--ink-ghost)",
                    fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)",
                    fontStyle: "italic",
                  }}
                >
                  Share updated scope doc beforehand. Align on cut features.
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[
                    { label: "P1", color: "var(--stamp-amber)" },
                    { label: "Medium", color: "var(--stamp-blue)" },
                    { label: "In Progress", color: "var(--stamp-blue)" },
                  ].map((c) => (
                    <Chip key={c.label} label={c.label} color={c.color} />
                  ))}
                </div>
              </div>
            </div>
          }
        />
      </Section>

      {/* ── Tips strip ── */}
      <section style={{ borderTop: "1px solid var(--border-light)", padding: "64px 0" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 40px" }}>
          <p
            style={{
              textAlign: "center",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--ink-ghost)",
              marginBottom: 40,
              fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)",
            }}
          >
            Tips & shortcuts
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24 }}>
            {[
              {
                icon: "⌨️",
                title: "Just type naturally",
                body: "\"remind sarah about the demo\" works. So does \"fix the broken thing in prod asap\". AI translates both.",
              },
              {
                icon: "🔍",
                title: "Filter by area",
                body: "Use the filter strip below the header to focus on one work stream without leaving the board.",
              },
              {
                icon: "✓",
                title: "Check off quickly",
                body: "Click the checkbox on any card to mark it done. It moves to archive automatically.",
              },
              {
                icon: "📅",
                title: "Overdue turns red",
                body: "Set a due date on any task. If it passes without being completed, the title turns red as a nudge.",
              },
              {
                icon: "⏳",
                title: "Waiting On status",
                body: "Blocked? Set status to Waiting On and note who. Cards show a yellow indicator so you remember to follow up.",
              },
              {
                icon: "📬",
                title: "Monday digest",
                body: "Every Monday morning you get an email with open P0s, P1s, and counts by area. No setup needed.",
              },
            ].map((tip) => (
              <div key={tip.title} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ fontSize: 22 }}>{tip.icon}</span>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--ink)",
                    fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)",
                  }}
                >
                  {tip.title}
                </p>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--ink-faint)",
                    lineHeight: 1.6,
                    fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)",
                  }}
                >
                  {tip.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section
        style={{
          borderTop: "1px solid var(--border-light)",
          background: "var(--paper-surface)",
          padding: "80px 40px",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-dm-serif)",
            fontSize: 36,
            color: "var(--ink)",
            letterSpacing: "-0.01em",
            marginBottom: 16,
          }}
        >
          Ready to clear your head?
        </h2>
        <p
          style={{
            fontSize: 15,
            color: "var(--ink-faint)",
            maxWidth: 400,
            margin: "0 auto 32px",
            lineHeight: 1.7,
            fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)",
          }}
        >
          Set up your workspace in 90 seconds.
          No card required.
        </p>
        <Link
          href="/signup"
          style={{
            display: "inline-block",
            padding: "11px 28px",
            background: "var(--ink)",
            color: "var(--paper-surface)",
            border: "1.5px solid var(--ink)",
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 500,
            fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)",
            textDecoration: "none",
            letterSpacing: "0.01em",
          }}
        >
          Get started free
        </Link>
        <p style={{ marginTop: 16, fontSize: 12, color: "var(--ink-ghost)", fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)" }}>
          Already have an account?{" "}
          <Link href="/" style={{ color: "var(--stamp-blue)", textDecoration: "underline" }}>
            Go to your board
          </Link>
        </p>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--border-light)",
          padding: "20px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-dm-serif)",
            fontSize: 16,
            color: "var(--ink-ghost)",
          }}
        >
          Radar
        </span>
        <div style={{ display: "flex", gap: 20 }}>
          {[
            { label: "Board", href: "/" },
            { label: "Settings", href: "/settings" },
            { label: "Archive", href: "/tasks/archive" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              style={{
                fontSize: 12,
                color: "var(--ink-ghost)",
                textDecoration: "none",
                fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)",
              }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </footer>

    </div>
  );
}
