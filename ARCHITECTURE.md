# System Architecture & KT Doc
**My Task List** — Personal productivity tracker for a CPO/product leader.

---

## What this app is

A local-first personal task tracker that replaces the habit of tracking tasks as Slack DMs or notes. Tasks are classified and rewritten by Claude AI, organized into buckets by product area, and optionally imported from a Slack channel.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16.2.1 (App Router, Turbopack) | Full-stack in one repo, fast dev |
| Database | SQLite via `better-sqlite3` | Local-first, zero infra, single file |
| AI | Claude Haiku (`claude-haiku-4-5-20251001`) | Fast + cheap for classification |
| Data fetching | SWR with polling | Live updates without websockets |
| Styling | Tailwind CSS + CSS custom properties | Apple-style design tokens in globals.css |

**No dark mode. Light-only. Apple website aesthetic.**

---

## Directory Structure

```
/
├── app/
│   ├── page.tsx                    # Main single-page layout (sidebar + all sections)
│   ├── layout.tsx                  # Bare HTML wrapper only
│   ├── globals.css                 # Apple design tokens (CSS vars), animations
│   ├── settings/page.tsx           # Bucket CRUD + Slack integration setup
│   ├── tasks/
│   │   ├── archive/page.tsx        # Completed tasks grouped by bucket
│   │   └── [bucketSlug]/page.tsx   # Redirects → / (old route, kept for safety)
│   └── api/
│       ├── classify/route.ts       # POST: classify + rewrite task text via Claude
│       ├── tasks/route.ts          # GET (list) + POST (create)
│       ├── tasks/[id]/route.ts     # PATCH (edit/complete) + DELETE
│       ├── buckets/route.ts        # GET (with task_count) + POST
│       ├── buckets/[id]/route.ts   # PATCH + DELETE (409 if has tasks)
│       ├── slack/poll/route.ts     # GET: import new messages from Slack channel
│       └── slack/test/route.ts     # GET: test creds | POST: save creds to DB
│
├── components/
│   ├── tasks/
│   │   ├── TaskSection.tsx         # Collapsible section card per bucket
│   │   ├── TaskRow.tsx             # Single task row (checkbox, title, badge, × delete)
│   │   ├── TaskDetail.tsx          # Inline expanded edit panel
│   │   └── QuickCapture.tsx        # Top-of-page task input with AI classification
│   ├── ui/
│   │   ├── PriorityBadge.tsx       # P0/P1/P2/P3 colored pill
│   │   ├── EffortChip.tsx          # Quick/Medium/Deep colored pill
│   │   └── StatusSelect.tsx        # Dropdown for Todo/In Progress/Waiting On/Done
│   └── buckets/
│       └── CountdownChip.tsx       # Days-until-deadline chip (red/orange/green)
│
├── lib/
│   ├── db.ts                       # SQLite singleton + TypeScript types
│   ├── schema.sql                  # DDL (buckets, tasks, meta tables)
│   ├── claude.ts                   # classifyTask() — calls Haiku, returns classification
│   └── slack.ts                    # getSlackCredentials() + fetchUnreadMessages()
│
├── tasks.db                        # SQLite database file (gitignored)
├── .env.local                      # ANTHROPIC_API_KEY + optional Slack creds
└── ARCHITECTURE.md                 # This file
```

---

## Database Schema

### `buckets`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| slug | TEXT UNIQUE | URL-safe identifier (e.g. `mobile-new-app-launch`) |
| name | TEXT | Display name |
| group_name | TEXT | `Mobile` / `Charts` / `General` |
| sort_order | INTEGER | Controls display order |
| deadline | TEXT | ISO date `YYYY-MM-DD`, optional |
| created_at | TEXT | SQLite datetime |

**Seeded buckets (created on first run, never re-seeded if any exist):**
```
Mobile:  New App Launch (deadline: 2026-05-11), Spotter 3, Pivots, Existing
Charts:  AI Agents, Muze Launch, Operations
General: Strategy & Brainstorm, Operational (id=9, fallback bucket)
```

### `tasks`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| title | TEXT | AI-rewritten imperative 1-liner |
| notes | TEXT | Optional freeform context |
| bucket_id | INTEGER FK | References buckets(id) ON DELETE RESTRICT |
| sub_area | TEXT | Only for New App Launch: `Personalization` / `Agent` / `UX` |
| priority | TEXT | `P0` urgent / `P1` this week / `P2` sprint / `P3` backlog |
| effort | TEXT | `Quick` <30m / `Medium` 30m–2h / `Deep` 2h+ |
| status | TEXT | `Todo` / `In Progress` / `Waiting On` / `Done` |
| waiting_on | TEXT | Free text: who/what this is blocked on |
| source | TEXT | `manual` or `slack` |
| slack_ts | TEXT UNIQUE | Slack message timestamp — prevents duplicate imports |
| created_at | TEXT | |
| completed_at | TEXT | Set automatically by PATCH when status → Done |

### `meta`
Key-value store. Current keys:
- `slack_token` — Slack user token (set via Settings UI)
- `slack_channel_id` — Slack channel ID (set via Settings UI)
- `slack_last_ts` — Slack message timestamp of last successful poll (auto-managed)

---

## UI Architecture

### Single-page layout (`app/page.tsx`)
The entire app lives on one page. Navigation is anchor-link scrolling, not routing.

```
┌─────────────────────┬──────────────────────────────────────────┐
│  Sidebar (240px)    │  Main content                            │
│                     │                                          │
│  My Tasks           │  [Top bar: date | show completed | sync] │
│  14 active          │                                          │
│                     │  [QuickCapture input]                    │
│  ⚡ Today      3    │                                          │
│  ◎ All Tasks  14    │  ─── Today (P0) section ────────────     │
│  ⏳ Waiting    2    │  ─── Waiting On section ────────────     │
│                     │                                          │
│  MOBILE             │  MOBILE ─────────────────────────────   │
│    New App Launch   │    [New App Launch card]                 │
│    Spotter 3        │    [Spotter 3 card]                      │
│    ...              │    ...                                   │
│                     │                                          │
│  CHARTS             │  CHARTS ─────────────────────────────   │
│  GENERAL            │  GENERAL ────────────────────────────   │
│                     │                                          │
│  ─────────────────  │                                          │
│  ✓ Archive          │                                          │
│  ⚙ Settings         │                                          │
└─────────────────────┴──────────────────────────────────────────┘
```

**Data fetching:** Single SWR call fetches ALL tasks at once (`/api/tasks?bucket=all`), then groups client-side. This avoids N+1 requests and enables cross-bucket views (Today, Waiting On).

**SWR refresh intervals:** Tasks: 5s, Buckets: 8s.

### TaskRow interaction
- Click row → inline `TaskDetail` expands below (edit title, notes, priority, effort, status, bucket)
- Hover row → `×` delete button appears (top-right)
- Click checkbox → toggles Done status with green animated checkmark

### Design system (globals.css)
```css
--page-bg:        #f5f5f7   /* Apple light gray */
--surface:        #ffffff
--surface-alt:    #fafafa
--border:         rgba(0,0,0,0.08)
--border-med:     rgba(0,0,0,0.12)
--text-primary:   #1d1d1f
--text-secondary: #6e6e73
--text-tertiary:  #aeaeb2
--accent:         #0071e3   /* Apple blue */
--red:            #ff3b30
--orange:         #ff9500
--green:          #34c759
--purple:         #af52de
--sidebar-w:      240px
```

---

## AI Classification (`lib/claude.ts`)

Every task added via QuickCapture goes through a two-step flow:

1. `POST /api/classify` → calls `classifyTask(text, buckets)`
2. `POST /api/tasks` → saves the result

**Claude Haiku prompt outputs:**
```typescript
{
  title_cleaned: string,  // Rewritten as crisp imperative 1-liner, max 100 chars
  bucket_id: number,      // Best matching bucket
  sub_area: string|null,  // Only for New App Launch bucket
  priority: "P0"|"P1"|"P2"|"P3",
  effort: "Quick"|"Medium"|"Deep"
}
```

**Priority rules:**
- P0 = urgent/today/critical
- P1 = this week
- P2 = this sprint
- P3 = backlog/someday

**Fallback:** If Claude fails (API error, JSON parse fail), returns `{ bucket_id: 9, priority: "P2", effort: "Medium" }` and uses the raw input text.

**Critical implementation note:** The Anthropic client is initialized lazily via `getClient()` function (not module-level `const client = new Anthropic()`). This is required because Next.js does not guarantee env vars at module load time in the App Router. Module-level initialization silently gets an empty API key.

---

## Slack Integration (`lib/slack.ts`)

**Credential priority order:**
1. `meta` table (`slack_token`, `slack_channel_id`) — set via Settings UI
2. `.env.local` env vars (`SLACK_USER_TOKEN`, `SLACK_CHANNEL_ID`) — legacy fallback

**Polling flow (`GET /api/slack/poll`):**
1. `fetchUnreadMessages()` → calls `conversations.history` with `oldest=slack_last_ts`
2. Each message → `classifyTask()` → insert into tasks
3. `slack_ts` column is UNIQUE → duplicate messages silently ignored
4. `slack_last_ts` in meta updated to newest message ts after each poll

**Token types supported:** `xoxp-` (user token from api.slack.com) or `xoxc-` (extracted from browser DevTools). Enterprise Grid users typically need Option B (ask IT) or Option C (extract from browser) since app self-service may be disabled.

**Setup UI:** Settings → Slack Integration section has 3 collapsible guides (A/B/C). Test Connection button verifies before allowing Save.

---

## Known Issues & Gotchas

1. **API key must not be in shell environment as empty string.** If `ANTHROPIC_API_KEY=""` is exported in `~/.zshrc`, it overrides `.env.local` and silently breaks classification. All tasks fall to the Operational bucket (id=9). Fix: ensure `.zshrc` has a correct non-empty export.

2. **Next.js dev hot-reload + SQLite:** The `global.__db` singleton pattern prevents creating multiple DB connections during hot reload in development.

3. **`better-sqlite3` is a native Node module** — must be listed in `serverExternalPackages` in `next.config.ts` (not the deprecated `experimental.serverComponentsExternalPackages`).

4. **`.env.local` must use standard hyphens in comments.** Em dashes (`—`) in comments caused the dotenv parser to silently fail in Next.js. Fixed by using regular hyphens.

5. **Bucket deletion is restricted** — returns 409 if the bucket has tasks. Tasks must be reassigned or deleted first.

---

## Running Locally

```bash
# Prerequisites: Node 20+, no other setup needed

cd "My task list"
npm install
npm run dev        # http://localhost:3000
```

The SQLite DB (`tasks.db`) is created automatically on first request. Buckets are seeded once.

**Required env var:**
```
# .env.local
ANTHROPIC_API_KEY=sk-ant-api03-...
```

**Optional (Slack):**
```
SLACK_USER_TOKEN=xoxp-...
SLACK_CHANNEL_ID=C0XXXXXXXXX
```
Or configure via Settings UI — credentials stored in SQLite `meta` table.
