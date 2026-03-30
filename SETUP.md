# Radar — External Services Setup Guide

**Order matters.** Do these in sequence. Some services depend on others (Vercel needs your GitHub repo, Resend needs your domain).

---

## 1. GitHub

**What for:** Code hosting. CI/CD triggers Vercel deploys automatically.

You probably already have this. If not:
1. Sign up at github.com — free
2. Create a new repository: `radar-app` — private

**What you get:** Repo URL.

---

## 2. Domain Name

**What for:** Your production URL. Also required for Resend email sending and Google OAuth.

**Where to buy:**
- Cloudflare Registrar — at-cost pricing, best value
- Namecheap — cheapest, ~$10–15/year
- Google Domains — easiest DNS management

**Steps:**
1. Search for your domain name
2. Buy it — `.app` domains require HTTPS (Vercel handles this automatically)
3. Don't configure DNS yet — do that after Vercel setup

**Cost:** ~$10–15/year

**Gotcha:** `.app` enforces HTTPS at the TLD level. Vercel auto-provisions SSL so it's not a problem in production, but don't try to run it on plain HTTP with this domain.

---

## 3. Vercel

**What for:** Hosting your Next.js app. Handles cron jobs (weekly digest), preview deployments per PR, and environment variables.

**Sign up:** vercel.com → "Sign up with GitHub"

**Plan:** Free (Hobby) is enough to launch. Upgrade to Pro ($20/month) only when you need team members or more build minutes.

**Steps:**
1. Sign up with GitHub
2. Click "Add New Project" → Import your `radar-app` repository
3. Framework preset: Next.js (auto-detected)
4. Don't deploy yet — you need env vars first. Just connect the repo.
5. Go to Project Settings → Domains → Add your custom domain
6. Vercel gives you DNS records — go to your domain registrar and add them (usually 2 A records or 1 CNAME)
7. SSL is automatic once DNS propagates (5 min–48 hours)

**What you get:**
- `NEXTAUTH_URL` = your production domain (e.g. `https://radarapp.io`)
- A deployment URL (`radar-app.vercel.app`) usable before DNS is set up

**Crons:** Configured in `vercel.json` — no separate signup. Free on Hobby, limited to 2 cron jobs (you only need 1).

---

## 4. Neon (PostgreSQL)

**What for:** Your production database.

**Sign up:** neon.tech → "Sign up with GitHub"

**Plan:** Free tier is enough for launch (0.5 GB storage, 1 compute unit). Paid starts at $19/month — you won't need it until you have real traffic.

**Steps:**
1. Sign up
2. Create a new project → Name it `radar`
3. Select region closest to your Vercel deployment (usually `us-east-1`)
4. Go to Dashboard → Connection Details
5. Select **"Prisma"** from the connection string format dropdown
6. Copy both connection strings:
   - **Pooled connection** (app runtime) → `DATABASE_URL`
   - **Direct connection** (migrations) → `DIRECT_URL`

**What you get:**
```
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true
DIRECT_URL=postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
```

**Prisma schema must include both:**
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

**Gotcha:** Always use `DIRECT_URL` for `prisma migrate deploy`. Using the pooled URL for migrations causes failures.

---

## 5. Upstash (Redis)

**What for:** Rate limiting (auth endpoints, AI calls, task creation).

**Sign up:** upstash.com → "Sign up with GitHub"

**Plan:** Free tier — 10,000 commands/day, 256 MB. More than enough for launch.

**Steps:**
1. Sign up
2. Click "Create Database"
3. Name: `radar-ratelimit`
4. Type: Regional (not Global — cheaper, fast enough)
5. Region: Same as your Vercel/Neon region
6. Click "Create"
7. Go to database details → REST API section → copy credentials

**What you get:**
```
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxxx
```

---

## 6. Google OAuth

**What for:** "Sign in with Google" button — your highest-converting signup method.

**Where:** console.cloud.google.com

**Steps:**
1. Go to console.cloud.google.com
2. Create a new project → Name it `Radar`
3. Left sidebar → "APIs & Services" → "OAuth consent screen"
4. User Type: **External** (so anyone can sign in, not just your org)
5. Fill in:
   - App name: `Radar`
   - User support email: your email
   - Developer contact: your email
   - Authorized domains: your domain (e.g. `radarapp.io`)
6. Scopes: Add `email` and `profile` — that's all you need
7. Save and continue through to the end
8. Left sidebar → "Credentials" → "Create Credentials" → "OAuth Client ID"
9. Application type: **Web application**
10. Name: `Radar Web`
11. Authorized JavaScript origins:
    - `http://localhost:3000`
    - `https://yourdomain.com`
12. Authorized redirect URIs:
    - `http://localhost:3000/api/auth/callback/google`
    - `https://yourdomain.com/api/auth/callback/google`
13. Click Create → Copy credentials

**What you get:**
```
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
```

**Gotcha:** App starts in "Testing" mode — only manually added test users can sign in. Before launch go to OAuth consent screen → Publishing status → **"Publish App"**. Google may ask you to verify your domain via a DNS TXT record (5 minutes).

---

## 7. Resend (Email)

**What for:** Transactional emails — signup confirmation, password reset, weekly digest, magic links.

**Sign up:** resend.com → "Sign up with GitHub"

**Plan:** Free tier — 3,000 emails/month, 100/day. Enough for launch.

**Steps:**
1. Sign up
2. Go to "Domains" → "Add Domain"
3. Enter your domain (e.g. `radarapp.io`)
4. Resend gives you DNS records to add:
   - SPF record (TXT)
   - DKIM records (2–3 TXT records)
   - DMARC record (TXT)
5. Add all of them at your domain registrar
6. Click "Verify" in Resend — takes a few minutes
7. Go to "API Keys" → "Create API Key"
8. Name: `radar-production`, Permission: Full access

**What you get:**
```
RESEND_API_KEY=re_xxxxx
```

Your sending address will be something like `notifications@radarapp.io` — configured in code when sending, no extra setup.

**Gotcha:** You cannot send from Gmail/Yahoo addresses on a custom domain via Resend. You must send from your own verified domain. This is why domain setup comes before Resend.

---

## 8. Anthropic (Claude API)

**What for:** AI classification — the core feature of the product.

**Sign up:** console.anthropic.com

**Plan:** Pay-as-you-go. No subscription. Add a credit card, put in $20–50 to start.

**Steps:**
1. Sign up at console.anthropic.com
2. Go to "Settings" → "Billing" → Add credit card + credits
3. Go to "API Keys" → "Create Key"
4. Name: `radar-production`
5. Copy the key immediately — shown only once

**What you get:**
```
APP_ANTHROPIC_KEY=sk-ant-xxxxx
```

Named `APP_ANTHROPIC_KEY` (not `ANTHROPIC_API_KEY`) to avoid conflict with the Claude Code VS Code extension.

**Cost reality check:** 100 users × 30 classifications/day × $0.001 = $3/day. At launch (10–20 users) you're spending cents.

**Gotcha:** New accounts start at Tier 1 — limited to 50 API calls/minute on Haiku. Fine for launch. Limits increase automatically as you spend more.

---

## 9. Sentry

**What for:** Error tracking. Know when things break in production without users telling you.

**Sign up:** sentry.io → "Sign up with GitHub"

**Plan:** Free tier — 5,000 errors/month, 10,000 performance transactions. More than enough.

**Steps:**
1. Sign up
2. Create a new project → Platform: **Next.js**
3. Name: `radar`
4. Run the setup wizard in your project:
   ```bash
   npx @sentry/wizard@latest -i nextjs
   ```
   This auto-configures `next.config.ts` and creates the Sentry config files. Don't do it manually.
5. Copy the DSN from the setup screen

**What you get:**
```
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_AUTH_TOKEN=sntrys_xxx
```

---

## 10. Stripe

**What for:** Payments, subscriptions, billing management.

**Sign up:** stripe.com

**Plan:** No monthly fee. 2.9% + 30¢ per transaction. No upfront cost.

**Part A — Account setup:**
1. Sign up at stripe.com
2. Activate your account — requires legal business info (name, address, SSN/EIN for US)
3. You can use test mode without activation, but need activation to receive real money

**Part B — Create products:**
1. Dashboard → "Product catalog" → "Add product"
2. Create your Pro plan:
   - Name: `Radar Pro`
   - Pricing: `$9.00` / month (recurring)
   - Add a second price: `$79.00` / year (recurring)
3. Copy both **Price IDs** — you'll use these in code:
   ```
   STRIPE_PRICE_MONTHLY=price_xxxxx
   STRIPE_PRICE_ANNUAL=price_xxxxx
   ```

**Part C — Get API keys:**
1. Dashboard → Developers → API keys
2. Copy test mode keys first for development, swap for live keys before launch:
   ```
   STRIPE_SECRET_KEY=sk_live_xxx
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
   ```

**Part D — Webhook setup:**
1. Dashboard → Developers → Webhooks → "Add endpoint"
2. Endpoint URL: `https://yourdomain.com/api/webhooks/stripe`
3. Events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.payment_succeeded`
4. Copy the webhook signing secret:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxx
   ```

**Local webhook testing:** Stripe can't call localhost. Install the Stripe CLI and forward events during development:
```bash
brew install stripe/stripe-cli/stripe
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

**Gotcha:** Stripe account activation can take 1–2 days if they request additional verification. Do this early.

---

## 11. Slack App (Phase 1.5 — skip for launch)

Skip this until you're building Slack integration. When ready:

**Steps:**
1. api.slack.com/apps → "Create New App" → "From scratch"
2. Name: `Radar`, pick your workspace
3. "OAuth & Permissions" → add Bot Token Scopes:
   - `channels:history`
   - `reactions:read`
   - `chat:write`
4. "Event Subscriptions" → enable → Request URL: `https://yourdomain.com/api/slack/events`
5. Subscribe to bot events: `message.channels`, `reaction_added`
6. "OAuth & Permissions" → "Install to Workspace"
7. Copy credentials

**What you get:**
```
SLACK_CLIENT_ID=xxx
SLACK_CLIENT_SECRET=xxx
SLACK_SIGNING_SECRET=xxx
```

---

## Generate Secrets Locally

These aren't external services — just run these commands once:

```bash
# NEXTAUTH_SECRET
openssl rand -base64 32

# CRON_SECRET (protects /api/digest from public access)
openssl rand -base64 32

# ENCRYPTION_KEY (for Slack token encryption — Phase 1.5)
openssl rand -hex 32   # must be exactly 64 hex chars = 32 bytes
```

---

## All Environment Variables

```bash
# Auth
NEXTAUTH_SECRET=                    # openssl rand -base64 32
NEXTAUTH_URL=https://yourdomain.com

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Database (Neon)
DATABASE_URL=                       # pooled connection string
DIRECT_URL=                         # direct connection string (for migrations only)

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# AI (Anthropic)
APP_ANTHROPIC_KEY=

# Email (Resend)
RESEND_API_KEY=

# Error tracking (Sentry)
SENTRY_DSN=
SENTRY_AUTH_TOKEN=

# Cron auth
CRON_SECRET=                        # openssl rand -base64 32

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_PRICE_MONTHLY=
STRIPE_PRICE_ANNUAL=
STRIPE_WEBHOOK_SECRET=

# Encryption (Phase 1.5 — Slack tokens)
ENCRYPTION_KEY=                     # openssl rand -hex 32

# Slack (Phase 1.5)
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_SIGNING_SECRET=
```

Add all of these to Vercel: Project Settings → Environment Variables. Set for Production, Preview, and Development.

---

## Order of Operations

```
1.  Buy domain
2.  Sign up Vercel → connect GitHub repo → add domain → get DNS records
3.  Add all DNS records at registrar (Vercel A records + Resend SPF/DKIM/DMARC + Google domain verification)
4.  Sign up Neon → create DB → copy DATABASE_URL + DIRECT_URL
5.  Sign up Upstash → create Redis → copy credentials
6.  Sign up Google Cloud → create OAuth app → copy CLIENT_ID + SECRET
7.  Sign up Resend → add + verify domain → create API key
8.  Sign up Anthropic → add credits → create API key
9.  Sign up Sentry → create Next.js project → run wizard
10. Sign up Stripe → activate account → create products → set up webhook → copy keys
11. Generate NEXTAUTH_SECRET, CRON_SECRET locally
12. Add all env vars to Vercel
13. Run prisma migrate deploy against production DB
14. Deploy
```

DNS propagation (step 3) is the only thing you can't rush. Do it first and let it run in the background while you complete everything else.
