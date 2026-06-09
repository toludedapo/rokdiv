# ROKDIV Egg Tracker v2 — Cloud Edition

A mobile-first PWA with Supabase cloud sync, real-time data across all devices, login/signup, and a full crate inventory system.

---

## Quick Setup (15 minutes total)

### Step 1 — Create Supabase project (5 min)

1. Go to [supabase.com](https://supabase.com) → New Project
2. Choose a name (e.g. "rokdiv") and a strong database password → Create
3. Wait ~2 minutes for it to provision

### Step 2 — Run the schema (2 min)

1. In your Supabase project → **SQL Editor** → New query
2. Paste the entire contents of `supabase_schema.sql`
3. Click **Run** (green button)
4. You should see "Success. No rows returned."

### Step 3 — Enable Realtime (1 min)

In your Supabase project:
- **Database** → **Replication** → toggle ON for: `sales`, `collections`, `crate_inventory`

### Step 4 — Get your API keys (1 min)

In your Supabase project → **Settings** → **API**:

| Key | Where to find it |
|-----|-----------------|
| Project URL | "Project URL" box |
| Anon Key | "Project API keys" → `anon public` |

### Step 5 — Add env vars locally

```bash
cp .env.example .env
# Edit .env and paste your two values
```

### Step 6 — Add env vars to Vercel

Vercel Dashboard → Your Project → **Settings** → **Environment Variables**

Add both:
```
VITE_SUPABASE_URL        https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY   eyJ...your_anon_key...
```

---

## Deploy

```bash
npm install
npm run dev          # Test locally first

git add .
git commit -m "ROKDIV v2 with cloud sync"
git push             # Vercel auto-deploys
```

---

## Install as App (PWA)

**Android:** Open site in Chrome → Menu (⋮) → Add to Home Screen  
**iPhone:** Open site in Safari → Share (□↑) → Add to Home Screen

---

## Features in v2

| Feature | Detail |
|---------|--------|
| Login / Signup | Email + password via Supabase Auth |
| Cloud sync | Real-time across phone + desktop |
| Crate inventory | Total owned, In-Farm, With Buyers |
| Crates loaned | Track per-sale crate loans to customers |
| Crate returns | Log partial/full returns from debtors |
| Overdue crates | Red pulsing badge when crates out 7+ days |
| CSV export | Includes Crates Loaned + Crates Returned columns |
