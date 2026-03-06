# NSIA Sales Dashboard — Deployment Guide

A real-time sales dashboard for North Shore Ice Arena's LED scoreboard and digital media advertising program. Built with Next.js + Supabase + Tailwind CSS.

**Features:** Lead pipeline tracker, visual rate card, ROI calculator, outreach email templates.
**Stack:** Next.js 14 (React), Supabase (Postgres + Realtime), Tailwind CSS, Vercel hosting.
**Cost:** $0/month on free tiers.

---

## Deployment Steps (30–45 minutes)

### Step 1: Create a Supabase Project (5 min)

1. Go to [supabase.com](https://supabase.com) and sign up (free).
2. Click **New Project**. Name it `nsia-dashboard`.
3. Set a database password (save it somewhere).
4. Choose region: **US East** (closest to Chicago).
5. Wait ~2 min for the project to provision.

### Step 2: Run the Database Schema (5 min)

1. In your Supabase project, go to **SQL Editor** (left sidebar).
2. Click **New Query**.
3. Open the file `supabase-schema.sql` from this project.
4. Copy the entire contents and paste into the SQL Editor.
5. Click **Run**. You should see "Success. No rows returned" (the INSERT will say rows affected).
6. Go to **Table Editor** → you should see the `leads` table with 35 rows of prospect data.

### Step 3: Enable Realtime (1 min)

1. In Supabase, go to **Database** → **Replication** (left sidebar under Database).
2. Find the `leads` table and make sure the toggle is **ON** for realtime.
   (The SQL schema already does this, but verify it.)

### Step 4: Get Your API Keys (1 min)

1. In Supabase, go to **Settings** → **API** (left sidebar).
2. Copy these two values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon / public** key (long string starting with `eyJ...`)

### Step 5: Set Up the Project Locally (5 min)

```bash
# Clone or unzip this project
cd nsia-dashboard

# Install dependencies
npm install

# Create your environment file
cp .env.local.example .env.local
```

Edit `.env.local` and paste in your Supabase values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 6: Test Locally (2 min)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You should see the dashboard with all 35 leads loaded from Supabase. Try changing a lead's status — it should persist on refresh.

### Step 7: Deploy to Vercel (5 min)

1. Push this project to a GitHub repo:
   ```bash
   git init
   git add .
   git commit -m "NSIA Sales Dashboard"
   git remote add origin https://github.com/YOUR-USERNAME/nsia-dashboard.git
   git push -u origin main
   ```

2. Go to [vercel.com](https://vercel.com) and sign up with GitHub (free).

3. Click **Add New Project** → Import your `nsia-dashboard` repo.

4. In the **Environment Variables** section, add:
   - `NEXT_PUBLIC_SUPABASE_URL` → your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → your anon key

5. Click **Deploy**. Vercel builds and deploys in ~60 seconds.

6. Your dashboard is now live at `https://nsia-dashboard.vercel.app` (or whatever Vercel assigns).

### Step 8: Share with Your Team

Send your team the Vercel URL. That's it — no accounts needed. They open the link and see the same data. Changes sync in real-time via Supabase.

---

## Project Structure

```
nsia-dashboard/
├── app/
│   ├── layout.js          # Root layout with fonts
│   ├── globals.css         # Tailwind + custom styles
│   └── page.js             # Main dashboard (all 4 tabs)
├── lib/
│   └── supabase.js         # Supabase client + CRUD operations
├── supabase-schema.sql     # Database schema + seed data
├── .env.local.example      # Template for environment variables
├── package.json            # Dependencies
├── next.config.js          # Next.js config
├── tailwind.config.js      # Tailwind config
├── postcss.config.js       # PostCSS config
└── README.md               # This file
```

## How It Works

- **Database:** Supabase (Postgres) stores all lead data. The `leads` table has columns for company info, scoring, pipeline status, deal values, and notes.
- **Realtime:** Supabase Realtime pushes changes to all connected browsers instantly. When you update a lead status, your teammates see it within ~1 second.
- **Scoring:** Leads are auto-scored (0–100) based on category alignment, geographic proximity, business size, and existing sponsorship history. The algorithm runs client-side.
- **Hosting:** Vercel serves the Next.js app from their CDN. Free tier handles way more traffic than you'll need.

## Common Tasks

### Add a new lead
Click **+ Add Lead** in the Pipeline tab, fill in the form, click Save. The lead auto-scores and appears for all team members.

### Update lead status
Click the status dropdown directly in the table row. Changes save instantly.

### Prepare for a prospect call
1. Go to **Rate Card** tab, filter to the relevant inventory.
2. Open **ROI Calculator**, plug in estimated numbers.
3. Go to **Outreach** tab, select the lead, copy the email template.

### Add more leads in bulk
Use the Supabase dashboard → Table Editor → `leads` table. You can paste data directly or use the SQL Editor for INSERT statements.

### Customize pricing
Edit the `INVENTORY` and `TIER_INFO` objects in `app/page.js`. Redeploy via `git push` (Vercel auto-deploys on push).

### Back up your data
Supabase dashboard → Table Editor → Export as CSV.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Failed to load leads" | Check `.env.local` values match Supabase Settings → API |
| Changes not syncing | Verify Realtime is enabled: Database → Replication → leads toggle ON |
| Build fails on Vercel | Check that environment variables are set in Vercel project settings |
| Blank page | Open browser console (F12) for error messages |

## Future Enhancements

- **Authentication**: Add Supabase Auth if you want login-protected access
- **Custom domain**: Connect your own domain in Vercel settings (free)
- **Email integration**: Connect to SendGrid or Resend to send outreach emails directly
- **Analytics**: Add Supabase Edge Functions for automated weekly pipeline reports
