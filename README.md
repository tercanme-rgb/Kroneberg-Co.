# NicheLab — Complete Platform Documentation
**Version:** 2.0.0 | **Last Updated:** 2024 | **Classification:** Operational Reference

---

## Table of Contents
1. [System Architecture](#1-system-architecture)
2. [Repository Structure](#2-repository-structure)
3. [Supabase Setup](#3-supabase-setup)
4. [GitHub Pages Deployment](#4-github-pages-deployment)
5. [Admin Console Reference](#5-admin-console-reference)
6. [User Dashboard Reference](#6-user-dashboard-reference)
7. [API Key Configuration](#7-api-key-configuration)
8. [Tier System & Access Control](#8-tier-system--access-control)
9. [Report Generation Engine](#9-report-generation-engine)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. System Architecture

NicheLab is a fully static frontend platform backed by Supabase (PostgreSQL + Auth + Realtime). There is no Node.js server, no Docker, no build step. Both HTML files are self-contained single-file applications.

```
┌─────────────────────────────────────────────────────────┐
│                   GitHub Pages (CDN)                    │
│  nichelab-admin.html       nichelab-dashboard.html      │
│  (Admin-only URL)          (Public user-facing URL)     │
└──────────────┬──────────────────────┬───────────────────┘
               │                      │
               ▼                      ▼
┌─────────────────────────────────────────────────────────┐
│                  Supabase Backend                       │
│  Auth (email/password)   PostgreSQL (reports, profiles) │
│  Row Level Security      Realtime (WebSocket pub/sub)   │
└─────────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│               AI Provider Pool (Admin only)             │
│  Google Gemini (6 keys) → Groq (11 keys)               │
│  → OpenRouter (11 keys) [auto-rotation on rate limit]  │
└─────────────────────────────────────────────────────────┘
```

**Data flow:**
- Admin generates AI report → previews → publishes to Supabase `reports` table
- Supabase Realtime pushes INSERT event to all connected dashboards
- Users see new report appear live, subject to tier access gates

**No secrets are ever committed to GitHub.** API keys are stored in `localStorage` of the admin's browser only. Supabase credentials are stored in user `localStorage` on each device.

---

## 2. Repository Structure

```
nichelab/                        ← Your GitHub repository root
│
├── nichelab-admin.html          ← Admin console (report generation + publishing)
├── nichelab-dashboard.html      ← User-facing dashboard (auth + report reader)
├── nichelab-migration.sql       ← Supabase database schema (run once in SQL Editor)
├── .nojekyll                    ← Prevents GitHub Pages from running Jekyll
└── README.md                    ← This document
```

Keep both HTML files at the root. GitHub Pages serves them at:
- `https://yourusername.github.io/your-repo/nichelab-admin.html`
- `https://yourusername.github.io/your-repo/nichelab-dashboard.html`

Share only the dashboard URL publicly. Keep the admin URL private.

---

## 3. Supabase Setup

### 3.1 Create Project
1. Go to [supabase.com](https://supabase.com) → New Project
2. Choose a region close to your users
3. Save the database password (you will not need it directly, but keep it safe)

### 3.2 Run Migration
1. In Supabase Dashboard → **SQL Editor** → **New Query**
2. Copy the entire contents of `nichelab-migration.sql`
3. Paste and click **Run** (▶)
4. Expected result: `Success. No rows returned.`

> **Note:** If you see `"publication supabase_realtime already exists"` — this is non-fatal. The script handles it with a `DO $$ IF NOT EXISTS` block. Continue.

### 3.3 Create Admin User
1. Supabase Dashboard → **Authentication** → **Users** → **Add User**
2. Enter your email and a strong password
3. ✅ Check **"Auto Confirm User"** — this skips the email confirmation step
4. Click **Create User**

### 3.4 Grant Admin Privileges
In SQL Editor, run:
```sql
UPDATE public.profiles
SET role = 'admin', tier = 'pro'
WHERE email = 'your-email@example.com';
```

Verify:
```sql
SELECT id, email, role, tier FROM public.profiles;
```

### 3.5 Get Connection Credentials
In Supabase Dashboard → **Project Settings** → **API**:
- **Project URL**: `https://xxxxxxxxxxxx.supabase.co`
- **anon/public key**: `eyJhbGci...` (long JWT string)

These two values are entered in the Settings modal of the Admin Console and the Setup screen of the Dashboard.

### 3.6 Verify RLS Policies
Run this to confirm policies are active:
```sql
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```
You should see 8+ policies across `profiles`, `reports`, and `report_reads`.

---

## 4. GitHub Pages Deployment

### 4.1 Initial Setup
```bash
# 1. Create repository (can be private)
git init
git remote add origin https://github.com/yourusername/nichelab.git

# 2. Add all files
git add .
git commit -m "NicheLab v2.0 — initial deployment"
git push -u origin main
```

### 4.2 Enable GitHub Pages
1. Repository → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: `main` / Root `/`
4. Click **Save**

GitHub Pages URL will appear within 2-3 minutes:
`https://yourusername.github.io/nichelab/`

### 4.3 .nojekyll File
The `.nojekyll` file (empty, already in this repo) prevents GitHub's Jekyll processor from interfering with static HTML files. **Do not delete it.**

### 4.4 Updating Content
```bash
git add .
git commit -m "Update: describe change"
git push
```
GitHub Pages deploys within ~60 seconds.

### 4.5 Custom Domain (Optional)
1. Repository → **Settings** → **Pages** → **Custom domain**
2. Enter `yourdomain.com` or `app.yourdomain.com`
3. Add a CNAME DNS record at your domain registrar:
   - Host: `app` (or `@` for apex)
   - Value: `yourusername.github.io`
4. Check **Enforce HTTPS** once the certificate provisions (5-10 min)

---

## 5. Admin Console Reference

**Access:** `nichelab-admin.html` (keep this URL private)

### 5.1 First-Time Configuration
On first load, click **⚙ Settings** and fill in:
- **Supabase Project URL** and **Anon Key** (from Section 3.5)
- At least one API key per provider (more = better rate limit resilience)
- Click **Save Settings** — credentials persist in `localStorage`

Connection status shows in the top bar (green dot = connected).

### 5.2 Workflow
```
Select Category → Generate Subtopics → Select Niches → Run All → Preview → Publish
```

| Step | Action | Notes |
|------|--------|-------|
| Category | Click sidebar item | Resets subtopic list |
| Subtopics | "Generate with AI" | Calls AI for 10 niche suggestions |
| Select | Check individual or "All" | Multi-select supported |
| Run All | Starts generation queue | Processes sequentially |
| Preview | Click queue item | Preview updates live |
| Publish | Button in preview panel | Sends to Supabase |

### 5.3 Generation Queue
- Reports generate sequentially (one at a time) to avoid API rate limits
- Each report: 15 sections × 1 AI call = 15 API calls
- Each section targets 420+ words of professional HTML content
- Progress bar shows per-section completion
- Click any queue item to preview its current state

### 5.4 Published Reports
Click **Published Reports** in the top bar to:
- View all reports in Supabase
- See signal score, word count, analyst code
- Archive reports (hidden from users, not deleted)

### 5.5 PDF Export
1. Select a completed report in the queue
2. Click **PDF** button in the preview panel
3. `html2pdf.js` generates a print-quality A4 PDF
4. File downloads automatically as `NicheLab_{niche}_{analystCode}.pdf`

---

## 6. User Dashboard Reference

**Access:** `nichelab-dashboard.html` (share this URL publicly)

### 6.1 First-Time Setup (Per Device)
On first load, users see a Setup screen asking for:
- **Supabase Project URL**
- **Supabase Anon Key**

These are the same credentials used in the admin console. For a public deployment, you can pre-embed these by editing the `bootstrap()` function and hardcoding the values (not recommended for private repos).

> **Security note:** The Supabase `anon` key is designed to be public. Row Level Security (RLS) policies enforce what each authenticated user can access. The anon key cannot bypass RLS.

### 6.2 Authentication Flow
The auth flow is fully automatic:
1. Page loads → reads `localStorage` for Supabase credentials
2. If missing → Setup screen
3. If present → Supabase client initialized immediately (no button press)
4. `onAuthStateChange` listener routes to Login or Dashboard based on session
5. Session persists across page refreshes via Supabase's built-in JWT refresh

### 6.3 Dashboard Features
| Feature | Description |
|---------|-------------|
| Report Grid | Card view of all published reports, sorted by date |
| Category Filters | Filter chips for all 10 categories |
| Search | Real-time full-text search across title, niche, category, summary |
| Signal Score | Color-coded market opportunity indicator (0-100) |
| Live Feed | Right sidebar shows newly published reports in real time |
| Toast Notifications | Pop-up alerts for new reports and errors |
| Report Viewer | Full-screen iframe modal with complete HTML report |

### 6.4 Report Viewer
- Opens in a full-screen overlay
- Renders the complete HTML report including all tables, charts references
- Press ✕ or Escape to close

---

## 7. API Key Configuration

All keys are entered in the Admin Console → Settings. They are stored in `localStorage` only, never transmitted to any server except the respective AI provider's API endpoint.

### 7.1 Google Gemini
- **Model:** `gemini-2.0-flash`
- **Get keys:** [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Free tier:** 15 requests/minute, 1M tokens/day per key
- **Rate limit behavior:** 429 response → auto-switch to next key

### 7.2 Groq
- **Model:** `llama-3.3-70b-versatile`
- **Get keys:** [Groq Console](https://console.groq.com)
- **Free tier:** ~14,400 requests/day per key
- **Rate limit behavior:** 429 or `rate_limit_exceeded` → next key

### 7.3 OpenRouter
- **Model:** `meta-llama/llama-3.3-70b-instruct`
- **Get keys:** [OpenRouter](https://openrouter.ai/keys)
- **Pricing:** Pay-per-token, very affordable for this model
- **Rate limit behavior:** 429 → next key

### 7.4 Provider Rotation Strategy
The engine attempts providers in this order for each API call:
```
Gemini key 1 → 2 → 3 → 4 → 5 → 6
→ Groq key 1 → 2 → ... → 11
→ OpenRouter key 1 → 2 → ... → 11
```
On a rate-limit error (HTTP 429), the current key is skipped and the next is tried. On authentication errors (HTTP 401), the key is also skipped. On other errors (network, server), the error is thrown and generation pauses.

---

## 8. Tier System & Access Control

### 8.1 Tier Definitions

| Tier | Weekly Report Reads | Report Types | Price |
|------|---------------------|--------------|-------|
| **Starter** | 10 per 7-day rolling window | Starter-tier reports only | Free |
| **Pro** | Unlimited | All reports | Paid |
| **Admin** | Unlimited | All reports + admin console | N/A |

### 8.2 Changing a User's Tier
In Supabase SQL Editor:
```sql
-- Upgrade to Pro
UPDATE public.profiles
SET tier = 'pro'
WHERE email = 'user@example.com';

-- Downgrade to Starter
UPDATE public.profiles
SET tier = 'starter'
WHERE email = 'user@example.com';

-- View all users and tiers
SELECT email, role, tier, reports_used_this_week, week_reset_at
FROM public.profiles
ORDER BY created_at DESC;
```

### 8.3 Setting a Report's Required Tier
When publishing from the Admin Console, reports default to `starter` tier (visible to all). To restrict a report to Pro users only, update after publishing:
```sql
UPDATE public.reports
SET tier_required = 'pro'
WHERE title ILIKE '%your niche name%';
```

### 8.4 Weekly Usage Reset
The `increment_report_usage()` function auto-resets the counter when `week_reset_at` is more than 7 days old. No cron job required. The reset happens on the user's next report read.

---

## 9. Report Generation Engine

### 9.1 Report Structure
Each generated report contains exactly 15 sections:

| # | Section | Min Words | Key Table |
|---|---------|-----------|-----------|
| 1 | Executive Summary | 420 | Market Snapshot (6 cols) |
| 2 | Market Overview & Size | 420 | Market Segmentation (6 cols) |
| 3 | Target Audience Analysis | 420 | Audience Segment Breakdown (7 cols) |
| 4 | Problem-Solution Fit | 420 | Problem-Solution Matrix (7 cols) |
| 5 | Competitive Landscape | 420 | Competitive Matrix (7 cols) |
| 6 | Revenue Model Analysis | 420 | Revenue Model Comparison (7 cols) |
| 7 | Go-to-Market Strategy | 420 | GTM Channel Analysis (7 cols) |
| 8 | Technical Requirements | 420 | Technology Stack Assessment (7 cols) |
| 9 | Financial Projections (3-Year) | 420 | 3-Year Financial Model (7 cols) |
| 10 | Risk Assessment Matrix | 420 | Risk Assessment Matrix (8 cols) |
| 11 | Regulatory & Compliance | 420 | Regulatory Requirements Matrix (7 cols) |
| 12 | Marketing & Growth Strategy | 420 | Marketing Channel Mix (7 cols) |
| 13 | Key Success Metrics | 420 | KPI Framework (7 cols) |
| 14 | Implementation Roadmap | 420 | Implementation Roadmap (7 cols) |
| 15 | References & Data Sources | 420 | Data Source Quality Assessment (5 cols) |

### 9.2 Quality Standards Enforced by Prompt
- All financial figures non-rounded (e.g., `$2.37M`, `$14,823/month`)
- No square brackets or placeholder text
- No AI self-references or disclaimers
- Transitional sentence at end of every section
- Tables always ≥5 columns with ROI Impact + Implementation Timeline columns
- APA 7th citations from real organizations, dated ≤2024
- Anonymous analyst code format: `XX-XXXXX-####`

### 9.3 Report HTML Output
The generated HTML is stored verbatim in Supabase `reports.content`. It includes:
- Embedded Google Fonts (Crimson Pro, DM Sans, JetBrains Mono)
- Print-ready CSS with proper page break handling
- Responsive table layout
- Report header with classification metadata

---

## 10. Troubleshooting

### "No API keys configured"
→ Open Settings in Admin Console. Add at least one key for any provider.

### "All API providers exhausted"
→ All configured keys have hit rate limits simultaneously. Wait 60 seconds and retry. Add more keys to increase throughput.

### Dashboard shows Setup screen on every load
→ The Supabase credentials were not saved. Enter URL + anon key on the Setup screen and click **Connect & Continue**. Credentials save to `localStorage`.

### Auth loop / user not reaching dashboard
→ Run this in Supabase SQL Editor to check if profile exists:
```sql
SELECT * FROM public.profiles WHERE email = 'user@example.com';
```
If missing, the trigger may have failed. Insert manually:
```sql
INSERT INTO public.profiles (id, email, full_name)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', split_part(email,'@',1))
FROM auth.users
WHERE email = 'user@example.com'
ON CONFLICT (id) DO NOTHING;
```

### Realtime not working
→ Verify in Supabase Dashboard → **Database** → **Replication**: the `reports` table should appear in the `supabase_realtime` publication. If not, run:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;
ALTER TABLE public.reports REPLICA IDENTITY FULL;
```

### Reports not appearing in dashboard
→ Confirm the report's `status` is `published`:
```sql
SELECT id, title, status FROM public.reports ORDER BY created_at DESC LIMIT 10;
```
If `draft`, update: `UPDATE public.reports SET status='published', published_at=NOW() WHERE id='...';`

### PDF export blank or cut off
→ The `html2pdf.js` scale-2 setting requires the content to be fully rendered. If sections are very long, reduce to `scale: 1.5` in the `exportPDF()` function.

### "publication already exists" during migration
→ Non-fatal. The `DO $$ IF NOT EXISTS` block handles it. Migration completed successfully.

---

*NicheLab v2.0 — Built for autonomous market intelligence generation.*
*All report content is AI-generated. Verify critical business decisions with primary sources.*
