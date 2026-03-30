# Radar

AI-powered personal task board for knowledge workers managing multiple work streams.

Captures tasks in plain English, auto-classifies them into your areas with priority and effort, and surfaces them on a priority execution board.

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![Prisma](https://img.shields.io/badge/Prisma-5-2D3748) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)

---

## Features

- **Quick Capture** — type anything, AI rewrites it as a clean action item and routes it to the right area with priority + effort
- **Priority Board** — four columns (Today / This Week / Sprint / Backlog) answer "what do I do right now"
- **Area View** — see tasks grouped by your work streams for weekly review
- **User-defined areas** — you define your taxonomy, AI fills it automatically
- **Auth** — Google OAuth + email/password signup, 30-day sessions
- **Onboarding** — productive in 90 seconds with starter templates
- **Weekly digest** — Monday morning email with open P0s/P1s and counts by area
- **Archive** — searchable history of completed tasks with reopen support

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 App Router |
| Auth | NextAuth v5 (Google OAuth + credentials) |
| Database | SQLite via Prisma 5 |
| AI | Anthropic Claude Haiku (server-side) |
| Styling | Tailwind CSS + CSS variables |
| Data fetching | SWR |
| Email | Resend (weekly digest) |

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Fill in: NEXTAUTH_SECRET, ANTHROPIC_API_KEY, DATABASE_URL
# Optional: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, RESEND_API_KEY, CRON_SECRET

# 3. Set up the database
npx prisma db push

# 4. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

See [SETUP.md](SETUP.md) for detailed environment variable reference and production deployment instructions.

## Project Structure

```
app/
  page.tsx              # Main board (priority + area views)
  login/                # Sign in
  signup/               # Create account
  onboarding/           # Workspace setup with templates
  settings/             # Area management, plan info
  tasks/archive/        # Completed tasks
  api/
    tasks/              # CRUD + AI classification
    areas/              # Area management
    auth/               # NextAuth + signup
    digest/             # Weekly email (cron endpoint)

components/tasks/
  BoardCard.tsx         # Task card with inline edit
  TaskDetail.tsx        # Expanded task editor
  QuickCapture.tsx      # AI capture input

lib/
  classify.ts           # AI classification via Anthropic API
  prisma.ts             # Prisma client singleton

auth.ts                 # Full auth config (Node, Prisma adapter)
auth.config.ts          # Edge-safe auth config (used in proxy.ts)
proxy.ts                # Route protection middleware
prisma/schema.prisma    # Database schema
```

## AI Classification

When a task is captured, the server calls Claude Haiku to:
1. Rewrite the raw input as a clean action item
2. Assign it to one of the user's areas
3. Pick priority (P0–P3) and effort (Quick / Medium / Deep)

The Anthropic API key lives server-side only and is never exposed to the client.

## Deployment

The app is configured for Vercel (`vercel.json` included). Set all environment variables in the Vercel dashboard and run `npx prisma db push` against your production database before the first deploy.

For SQLite in production, use a persistent volume (e.g. Vercel Storage, Turso, or Fly.io with a mounted disk). See [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md) for architecture notes.
