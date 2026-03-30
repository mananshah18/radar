# Radar — SaaS Launch PRD (v2)

**Scope:** Personal/solo workspace model
**Date:** 2026-03-30
**Status:** Updated after review — incorporates feedback

---

## 1. Context & Why

Radar started as a localhost tool replacing the habit of tracking work in Slack DMs and scattered notes. The core insight: knowledge workers managing multiple simultaneous work streams need a fast-capture, AI-classified task board that maps to *their* areas — not a generic todo app.

**Market gap:** Notion can approximate this with 2 hours of setup. Todoist/Linear don't do user-defined taxonomy. Motion/Reclaim are calendar-first. No tool combines: user-defined work areas + AI auto-routing + priority execution board + Slack capture in one opinionated product.

**Window:** Slack building native AI task capture is the existential threat (~18-24 months). Ship fast.

**Deferred:** Payments/Stripe, Slack integration (Phase 2), public API, tags, dark mode, mobile, teams.

---

## 2. Target User

**Primary persona: Knowledge workers managing multiple work streams**
- CPOs, VPs Product, Senior PMs, founders, freelancers, consultants, engineering leads, marketing directors
- Anyone drowning in Slack threads + meeting follow-ups + scattered notes across 3-10 simultaneous work areas
- Currently in Notion (too heavy to set up), Todoist (too generic), or Slack DMs (chaos)

**The pitch vs. competitors:**
- vs. Notion: "Works in 90 seconds, zero setup" — the anti-Notion
- vs. Todoist: "Your taxonomy, not ours" — AI routes to areas you define
- vs. Linear: Personal, not a team tool
- vs. Motion/Reclaim: Execution-focused, not calendar-first

**Core differentiator (in order of priority):**
1. **User-defined taxonomy + AI routing** — you define the areas, AI fills them automatically
2. **Priority execution board as home** — Today/This Week/Sprint/Backlog answers "what do I do RIGHT NOW"
3. **Slack emoji-reaction capture** (Phase 2) — react to any message with ⚡ → becomes a Radar task
4. **Weekly digest** — Monday AM accountability loop, zero setup

**Key job to be done:**
> "When I capture a task, I want it instantly sorted to the right area and priority so I can focus on execution, not organisation."

---

## 3. Design System: Retro Pen-and-Paper

Radar should NOT look like every other AI-generated dark-mode SaaS app. The visual identity is analog: legal pads, index cards, rubber stamps, ink.

**Principles:**
- Paper over glass: warm cream/parchment backgrounds
- Ink over glow: dark warm-black text, no gradients
- Analog artifacts: ruled lines, stamp badges, index-card panels
- Typewriter typography: monospace + handwritten combo
- Texture without kitsch: subtle CSS paper grain, not a costume

**Color palette:**
```css
--paper-bg:      #F2EDE4;   /* aged parchment */
--paper-surface: #FAF7F2;   /* card surface */
--paper-dark:    #EAE3D8;   /* column bg */
--ink:           #1C1917;   /* primary text */
--ink-faint:     #78716C;   /* secondary */
--ink-ghost:     #A8A29E;   /* placeholders */
--stamp-red:     #B91C1C;   /* P0 — urgent */
--stamp-amber:   #B45309;   /* P1 — this week */
--stamp-blue:    #1D4ED8;   /* P2 — sprint */
--stamp-gray:    #6B7280;   /* P3 — backlog */
```

**Typography:** Special Elite (headings/app name), Courier Prime (body), Caveat (handwritten accents)

**Components:**
- Board columns: tabbed-divider headers, ruled-line background, thick left border accent
- Task cards: index-card style, angled drop shadow, left color accent by priority column
- QuickCapture: ruled-line input (bottom border only), pencil icon, stamp "ADD" button
- Filter chips: index-card tabs (rectangular, not pills)
- Header: paper-colored (no dark header), "RADAR" in Special Elite

---

## 4. Views

### 4.1 Priority Board (Home / Execution Mode)
Default home view. Four columns: **Today (P0)**, **This Week (P1)**, **Sprint (P2)**, **Backlog (P3)**.

This answers "what do I do RIGHT NOW" — the primary execution question.

### 4.2 Area View (Review Mode)
Secondary view accessible via a toggle/tab button at the top. Shows tasks grouped by user-defined areas instead of priority.

Use case: weekly review, understanding what's happening across each work stream.

**Both views required. Priority board is the default home.**

---

## 5. Must-Have Features for Launch

### 5.1 Authentication
- Google OAuth (primary — one-click)
- Email + password with bcrypt
- Magic link (passwordless)
- Password reset via email
- 30-day "remember me" sessions

Not in v1: SSO/SAML, 2FA, team invites.

### 5.2 Dynamic Workspaces
- New user → empty board, no hardcoded areas
- User creates **areas** (name, group/category label)
- Groups are user-defined labels to organise areas (not hardcoded Mobile/Charts/General)
- Settings page: create, edit, reorder, delete areas
- One area can be designated as "Inbox" (default fallback when AI is unsure)
- Delete area requires moving or deleting its tasks first

### 5.3 Onboarding
**Goal: productive in 90 seconds.**

No role-selection question. After email verification, show template cards directly:

> "Many people start with one of these — pick yours or start fresh:"
> `[ 🚀 Startup Founder ]  [ 🔧 Product & Engineering ]  [ 🎯 Marketing & Growth ]  [ Start blank ]`

One tap → areas load instantly. Then land on the board with an animated pointer to QuickCapture: *"Add your first task — AI will sort it for you."*

After first task: tooltip showing what AI did ("Filed under Core Platform · P1 · Quick").

**Empty state if skipped:** Ghost cards in each column that open QuickCapture on click.

### 5.4 Task Fields
**Keep:**
- Title (AI-rewritten, editable)
- Priority: P0 / P1 / P2 / P3
- Effort: Quick / Medium / Deep
- Status: Todo / In Progress / Waiting On / Done
- Waiting on (free text, when status = Waiting On)
- Notes (freeform)
- Area

**Add for v1:**
- **Due date** (optional; overdue tasks highlighted)

**Cut from v1:**
- Tags (underspecced, touches 5 surfaces, low urgency — reopen post-launch)
- `sub_area` (replaced by area + due date)

### 5.5 AI Classification

**What it does:**
1. User types anything in QuickCapture
2. AI rewrites it as a clean action item
3. Auto-assigns: area, priority, effort

**Changes from current:**
- AI must know the user's own areas (not hardcoded) — already works architecturally
- If < 2 areas: friendly message "Add at least one area so AI can classify your tasks"
- Inbox area as fallback when AI is unsure

**Prompt injection mitigations:**
1. User input clearly delimited in prompt
2. Response validated against strict JSON schema before use
3. Invalid/unexpected fields silently ignored
4. AI only returns JSON; no tool use, no agentic behavior
5. Log all inputs/outputs for abuse monitoring
6. Never include other users' data in any prompt

**LLM key:** Platform provides AI (Radar owns the Anthropic key server-side). Users pay via subscription; Radar absorbs AI costs. No user key entry.

### 5.6 Free Tier Limits (REVISED)

**Critical insight from review:** AI classification is the habit you need users to build. Do NOT cap the core loop. Gate on scope (areas, archive) and integrations (Slack), not AI.

| | Free | Pro |
|---|---|---|
| **Price** | $0 | $9/month or $79/year |
| **Areas** | 3 | Unlimited |
| **Active tasks** | 50 | Unlimited |
| **AI classifications/day** | **30** (raised from 10) | Unlimited |
| **Slack integration** | ✗ | ✓ |
| **Archive** | 30 days | Forever |
| **Area view** | ✓ | ✓ |
| **Weekly digest** | ✓ | ✓ |
| **Priority support** | ✗ | ✓ |

**Upgrade triggers (soft paywall with banner, not hard wall):**
- Hit 3-area limit → "You've outgrown free — unlock unlimited areas"
- Hit 50-task limit → upgrade prompt
- Try to set up Slack → Pro gate
- **Never:** "AI stopped working because you hit your daily limit" — this must never happen to a free user mid-flow

**14-day Pro trial on signup — no card required.**

### 5.7 Weekly Digest Email (NEW — in v1)

A Monday AM plain text email: open P0s and P1s, task count by area, one-click link back to the board.

**Why in v1:** Cheapest retention mechanic that exists. Users forget apps. This email is the weekly nudge that brings them back. Directly improves Week-1 return rate.

**Implementation:** Resend (or similar) + cron job. 5 lines of email, plain text, no HTML template needed.

### 5.8 Archive & History
- Archive view with full-text search (title + notes)
- Filter by area, date range, priority
- Ability to un-archive (reopen) a task
- Free: 30-day archive, Pro: forever

### 5.9 Settings
- **Profile:** Name, email, password change, delete account (GDPR)
- **Workspace:** Area management (create, edit, reorder, delete, set inbox default)
- **Notifications:** Weekly digest on/off
- **Billing:** Plan, upgrade/downgrade, payment method, invoices, cancel

---

## 6. Phase 2: Billing / Stripe (Spec for Future)

### Overview
Stripe handles subscriptions, invoices, failed payments, and cancellations. Stripe Checkout handles the payment UI — no PCI compliance needed in the app.

### Tiers recap (from 5.6)
- Free: 3 areas, 50 tasks, 30 AI/day, 30-day archive
- Pro: $9/month or $79/year — unlimited everything + Slack
- 14-day Pro trial on signup, no card required

### Stripe integration points

**Upgrade flow:**
1. User hits a free limit → soft banner prompt (never a hard wall mid-flow)
2. Click "Upgrade" → redirect to **Stripe Checkout** (hosted page, no custom card form)
3. On success: Stripe webhook fires → update `users.plan = 'pro'` in DB
4. User lands back on the board with Pro unlocked

**Self-service billing:**
- "Manage billing" in Settings → redirect to **Stripe Customer Portal**
- User can upgrade, downgrade, update payment method, view invoices, cancel — all handled by Stripe UI, zero custom code

**Webhooks to handle:**
- `customer.subscription.created` → grant Pro, record `stripe_subscription_id`
- `customer.subscription.updated` → sync plan changes (upgrade/downgrade)
- `customer.subscription.deleted` → downgrade to Free, enforce limits
- `invoice.payment_failed` → send dunning email, show in-app banner ("Payment failed — update card to keep Pro")
- All webhooks must be idempotent (use Stripe event ID as dedup key)

**DB additions:**
- `users.plan`: `'free'` | `'pro'` | `'trialing'`
- `users.stripe_customer_id`: string
- `users.stripe_subscription_id`: string
- `users.trial_ends_at`: timestamp
- `users.plan_expires_at`: timestamp (grace period on payment failure)

**Limit enforcement:**
- Area count checked on area creation API — 402 if Free user exceeds 3
- Task count checked on task creation — soft banner at 45, hard 402 at 50
- AI rate limit checked per-user per-day in Redis/KV store — never block mid-flow; queue or soft-warn at 28/day
- Archive cutoff enforced at read time (query `WHERE completed_at > NOW() - 30 days` for Free)

**Trial mechanics:**
- On signup: create Stripe customer, start 14-day trial (no card), set `plan = 'trialing'`
- Day 10: email "4 days left on your trial"
- Day 14: if no card → downgrade to Free, enforce limits
- No surprise charges; card only entered at upgrade

---

## 7. Phase 2: Slack Integration (Spec for Future)

Slack capture is the hero differentiator. When built, it must include:

1. **Bot capture:** DM the bot or use `/radar [task text]` in any channel
2. **Emoji-reaction capture:** React to any Slack message with ⚡ (or configurable emoji) → message becomes a Radar task, AI classifies it. Zero friction. This is the Product Hunt moment.
3. **Bot reply:** Bot replies in-thread with what it classified: "Added to iOS Launch · P1 · Quick ✓"
4. **Review queue (optional setting):** Tasks from Slack land in a queue before board. Some users want auto-import; others want to review.
5. **Bidirectional (stretch):** When task completed in Radar, bot reacts to original Slack message with ✅.
6. **Source attribution:** Cards show "via Slack" with the original message preview.

Slack credentials are per-user, not global.

---

## 8. Security

**Data isolation:** Every user's data completely isolated. All API routes filter by `session.user.id`.

**Auth security:**
- Passwords: bcrypt min 10 rounds
- Sessions: 30-day expiry, inactivity-based
- All API routes require session → 401 on failure
- HTTPS only in production

**AI security:**
- Anthropic API key server-side only, never exposed to client
- Rate limit: 30 AI/day free, unlimited Pro (with per-user rate tracking)
- Prompt injection: user input delimited + response schema-validated

**Data:**
- Production DB encrypted at rest (cloud provider)
- Passwords and payment info not stored in app DB
- GDPR: account deletion removes all data within 30 days
- Data export: JSON/CSV download

---

## 9. API Design (Internal, for Slack bot)

Define now even though public API is deferred. The Slack bot is a client of this API.

```
POST   /api/tasks              create task (AI classify optional)
GET    /api/tasks              list tasks (filters: area, priority, status, due)
PATCH  /api/tasks/:id          update title, priority, status, effort, due date
DELETE /api/tasks/:id          delete task
GET    /api/buckets            list user's areas
POST   /api/buckets            create area
PATCH  /api/buckets/:id        update area
```

Public API access (for power users' scripts) stays gated behind Pro — post-launch.

---

## 10. Success Metrics (90 days post-launch)

| Metric | Target |
|---|---|
| Signups | 500 |
| Week-1 return rate | 40% |
| Free → Pro conversion | 8% |
| Tasks/active user/week | 10+ |
| AI classification usage | 80% of tasks via QuickCapture |
| Weekly digest open rate | 35%+ |
| NPS | > 40 |

**North Star:** Tasks created per weekly active user.

---

## 11. Launch Checklist

- [ ] Privacy policy + Terms of service
- [ ] Cookie consent (GDPR)
- [ ] Account deletion flow (right to erasure)
- [ ] Data export (JSON/CSV)
- [ ] Weekly digest email (Resend + cron)
- [ ] Error tracking (Sentry)
- [ ] Uptime monitoring
- [ ] Transactional emails (signup confirmation, password reset)
- [ ] Stripe webhook handler + idempotency
- [ ] Rate limiting on all API routes
- [ ] Input validation on all POST/PATCH routes
- [ ] Landing page
- [ ] Domain + SSL

---

## 12. Build Phases

### Phase 1 (Now)
1. Retro pen-and-paper design system (UI overhaul)
2. Authentication (NextAuth — Google OAuth + email/password)
3. Dynamic workspaces (user-defined areas, onboarding templates)
4. Due dates on tasks
5. Area view (toggle from priority board)
6. Weekly digest email

### Phase 2 (After 20+ weekly active users on Phase 1)
1. Stripe billing (Free/Pro tiers, Checkout, Customer Portal) — see §6
2. Slack integration — Events API + emoji-reaction capture — see §7 and §14.2
3. Email forwarding to inbox — see §14.3
4. AI personalization (learn from corrections) — see §14.4
5. Morning intention nudge — see §14.5
6. Mobile PWA (capture only) — see §14.6
7. Browser extension — see §14.7
8. Public API (Pro only)

### Phase 3 (Post-launch)
1. Tags (if users ask)
2. Mobile/PWA
3. Team workspaces
4. Dark mode

---

## 13. Open Questions

1. **Area view layout**: Grid of area cards? Or list with sub-tasks visible? Recommendation: horizontal scroll of area columns, mirroring the priority board layout — consistent mental model.

2. **Inbox area**: Should the onboarding templates always include an "Inbox" area by default? Recommendation: yes, pre-create it — teaches the pattern without a config screen.

3. **Weekly digest timing**: Monday AM is the obvious choice. Allow users to change day/time? Recommendation: hardcode Monday 8AM user-local timezone for v1, make configurable post-launch.

4. **AI classification on Area view creation**: When a user creates a new area, should old tasks be re-classified? Recommendation: no (too risky to change historical data). New area applies to future tasks only.

---

## 14. Phase 2: Focus Areas & Strategic Priorities

**Trigger:** Don't start Phase 2 until you have 20+ weekly active users on Phase 1. Distribution first, features second.

**Strategic frame:** This product is not competing in "task management." It is competing for ownership of the user's daily work intake and execution loop. Every Phase 2 investment should expand the capture surface or deepen the habit loop — nothing else.

---

### 14.1 Priority Order

| Priority | Feature | Why |
|---|---|---|
| 1 | Slack — Events API + emoji-reaction capture | The actual differentiator. Real-time, not polling. Demo-able. Viral. |
| 2 | Email forwarding to inbox | Huge capture surface, low build cost, immediate use case for any PM |
| 3 | AI personalization (learn from corrections) | Only Radar has this signal. Compounding moat. |
| 4 | Morning intention nudge | Retention mechanic. Cheap. High impact on weekly active rate. |
| 5 | Mobile PWA (capture only) | Plugs the "I'm in a meeting" hole without building a full mobile app |
| 6 | Browser extension | After Slack and email are solid |

---

### 14.2 Slack Integration (Real-Time, Not Polling)

Already specced in §7. The critical implementation detail that changes the feature from "nice-to-have" to "killer":

**Use Slack Events API, not polling.**

The current design polls Slack every ~6 minutes. That is a delayed import, not a capture layer. Real-time is the product.

- Slack sends a push event to `/api/slack/events` the moment a user reacts or sends a message
- React to any message with ⚡ → task created and classified in under 2 seconds
- Bot replies in-thread: "Added to iOS Launch · P1 · Quick ✓"

This is the demo-able, shareable moment. This is the Product Hunt headline. Polling cannot create that moment.

**Virality mechanism:** Teammates in the same Slack workspace see the bot reply. They ask "what's that?" That is the organic growth loop.

---

### 14.3 Email Forwarding to Inbox (New)

Forward any email to `inbox@yourdomain.com` → Radar receives it, AI classifies it, task created automatically.

**Why this matters:** A PM's second-biggest source of tasks (after Slack) is email — customer escalations, stakeholder asks, meeting follow-ups. Right now those tasks require manual copy-paste into Radar.

**Build cost:** One afternoon. Resend supports inbound email parsing. Parse subject + body → run through existing classification pipeline → same flow as QuickCapture.

**User experience:** Set up once in Settings (copy the forwarding address). Then forward any email directly from Gmail/Outlook with one tap. No app switching, no copy-paste.

---

### 14.4 AI Personalization — Learning from Corrections (New)

**This is the actual long-term moat.** Every other competitor can copy AI classification. Nobody can copy a classifier that has learned your specific work taxonomy over months of corrections.

**The signal already exists:** The eval framework (System Design §10) already tracks `user_corrected = true` when a user moves a task to a different area or changes its priority. That is implicit feedback that the AI got it wrong.

**Phase 2 investment:** Build a lightweight personalization layer on top of the base classifier:
- After 20+ corrections, include recent correction patterns in the classification prompt context: *"This user typically moves design-related tasks to 'UX Research' not 'Product.' Prefer that area for design inputs."*
- Over time: the AI learns that for this user, "iOS crash" is always P0, "dark mode" is always P3, anything from "Sarah" is Waiting On
- No retraining needed — this is prompt context, not model fine-tuning

**Why this creates lock-in:** A Radar that has learned 6 months of your taxonomy is better than a fresh Radar. That delta is yours. Moving to a competitor resets to zero.

---

### 14.5 Morning Intention Nudge (New)

**Problem with weekly digest alone:** Users check in on Mondays and drift by Wednesday. The habit loop needs a daily touchpoint, but it cannot feel like guilt or nagging.

**The right mechanic — not a reminder, an intention prompt:**

Monday morning email (or optionally daily):
> "Good morning. You have 3 open P0s and 7 P1s this week.
> What's the one thing that moves the needle today?
> → [Open Radar]"

Pre-populates from the board. 60 seconds to read. One-click back into the app.

**Why this works:** It reframes the interaction from "here's what you didn't do" (guilt) to "here's what you could do" (agency). Opt-in. Plain text. No design required.

**Build cost:** Extend the existing digest cron. Same Resend integration, different schedule and template.

---

### 14.6 Mobile PWA — Capture Only (Not a Full App)

**The PRD correctly deferred a full mobile app.** But there is one specific mobile moment that kills retention: being in a meeting, having a task come up, and having no frictionless way to capture it on your phone.

**Scope:** Not a mobile app. A PWA (Progressive Web App) with exactly one screen — QuickCapture. Type task → submit → classified and saved. No board, no management, no navigation.

- Installable to home screen ("Add to Home Screen")
- Opens directly to the capture input, full-screen
- Submits to the same `POST /api/tasks` endpoint
- Done

**Build cost:** A single React page + PWA manifest + service worker. A day of work.

**What this is not:** A full mobile experience. Users manage tasks on desktop. They capture on mobile. That is the right division.

---

### 14.7 Browser Extension (Lower Priority)

Capture tasks from anywhere on the web — highlight text on a page, right-click → "Add to Radar."

**Why lower priority than Slack and email:** Slack and email are where PM tasks actually originate. Web browsing generates research tasks, not work tasks. Validate the higher-priority captures first.

**When to build:** After Slack integration is stable and email forwarding is shipped.

---

### 14.8 What Phase 2 Is NOT

Stay disciplined. These are explicitly deferred past Phase 2:

| Feature | Reason |
|---|---|
| Tags | Still underspecced. Reopen only if users explicitly request it. |
| Team workspaces | Different product. Different pricing model. Different support burden. |
| Dark mode | Low conversion impact. Build it when you have time to spare. |
| Full mobile app | Desktop is where PMs execute. Mobile capture (PWA) is enough. |
| AI chat ("Ask Radar") | Interesting future feature. Requires real-time context retrieval. Post-PMF. |
| Calendar integration | Out of scope. Motion/Reclaim own this. Don't compete. |

---

### 14.9 Phase 2 Success Metrics

| Metric | Target |
|---|---|
| Slack integration adoption (Pro users) | > 60% connect Slack within 7 days of upgrade |
| Tasks captured via Slack | > 30% of all tasks from Slack-connected users |
| Tasks captured via email forward | > 10% of all tasks from email-enabled users |
| Week-4 retention (came back in week 4) | > 25% |
| Daily active / Weekly active ratio | > 40% |
| AI correction rate (tasks moved by user after classify) | < 15% |
