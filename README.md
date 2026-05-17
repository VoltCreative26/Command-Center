# Command Center — Deploy Guide

Goal: this dashboard on your phone, in use, by tomorrow morning. Estimated time: **20–30 minutes**.

---

## What this is

A personal operating system built around five things:

1. **Morning Anchor** — three questions before the day begins
2. **Today's Schedule + Tasks** — the hour-by-hour layout you already know works, with estimated minutes per task
3. **Scoreboard** — streak counter + actions shipped this week (the dopamine loop)
4. **Idea Inbox** — every captured idea gets a forced 25-minute first action, expires in 7 days if not scheduled
5. **90-Day North Stars** — fully editable goals per business

Plus: when you check off a task, you log how long it actually took. After ~5 completed tasks with both numbers logged, the dashboard shows you your personal **time inflation ratio** — the gap between what you estimate and reality. That data is what slowly retrains the instinct that makes 20-minute tasks feel like 90-minute tasks.

---

## Step 1 — Set up Supabase (5 min)

1. Go to **https://supabase.com** → sign up / log in
2. Click **New Project**
3. Pick a name (e.g. "command-center"), set a strong database password, choose the region closest to you
4. Wait ~2 minutes for it to provision
5. In your project dashboard, click the **SQL Editor** in the left sidebar
6. Click **New Query**, paste the entire contents of `supabase/schema.sql` from this repo, click **Run**
7. You should see "Success. No rows returned." — that's correct, it just created the tables
8. In the left sidebar, click **Project Settings** → **API**
9. Copy two values, you'll need them in step 2:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

---

## Step 2 — Push to GitHub (5 min)

From the directory where this code lives:

```bash
git init
git add .
git commit -m "Initial commit"
gh repo create command-center --private --source=. --push
```

If you don't have the GitHub CLI installed, create the repo manually at github.com/new (private), then:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/command-center.git
git branch -M main
git push -u origin main
```

---

## Step 3 — Deploy to Vercel (5 min)

1. Go to **https://vercel.com** → log in with GitHub
2. Click **Add New → Project**
3. Find your `command-center` repo → **Import**
4. Framework Preset should auto-detect as **Vite** — leave it
5. Expand **Environment Variables** and add two:
   - `VITE_SUPABASE_URL` → paste the Project URL from Supabase
   - `VITE_SUPABASE_ANON_KEY` → paste the anon key from Supabase
6. Click **Deploy**
7. Wait ~60 seconds. You'll get a URL like `command-center-xxxx.vercel.app`

---

## Step 4 — One more thing in Supabase (2 min)

So your magic-link emails redirect back to your Vercel URL, not localhost:

1. Back in Supabase → **Authentication** → **URL Configuration**
2. Set **Site URL** to your Vercel URL (e.g. `https://command-center-xxxx.vercel.app`)
3. Under **Redirect URLs**, add the same URL
4. Save

---

## Step 5 — Install on your phone (1 min)

1. Open the Vercel URL on your phone in Safari (iOS) or Chrome (Android)
2. Sign in with your email — check inbox, click the magic link
3. **iOS**: Tap the share icon → **Add to Home Screen**
   **Android**: Tap the three-dot menu → **Add to Home Screen** / **Install app**
4. The icon is now on your home screen. Tap it. It opens full-screen, no browser chrome, indistinguishable from a native app.

---

## You're done. Tomorrow morning:

Before email, before Slack, before anything else: open the app, fill out the morning anchor, build the day's hour-by-hour schedule.

Capture every idea that comes up during the day in the Idea Inbox. The 7-day timer is doing work for you — it forces a decision instead of letting things sit in a graveyard.

When you check off a task, **log the actual minutes**. Don't skip this step for the first two weeks — the inflation ratio insight only appears after you have data, and that insight is the most valuable thing this whole system does.

---

## Iterating later

To make changes:

```bash
# edit code locally
git add .
git commit -m "what you changed"
git push
```

Vercel auto-deploys every push to `main`. New version is live on your phone in 60 seconds.

---

## Local dev

```bash
npm install
cp .env.example .env.local
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local
npm run dev
```
