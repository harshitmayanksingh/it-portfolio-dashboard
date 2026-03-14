# IT Portfolio Dashboard — Complete Setup Guide
## InsightBridge Team 2 | Capstone 2026

---

## WHAT'S IN THIS PROJECT

```
it-portfolio-dashboard/
├── src/
│   ├── App.tsx          ← ENTIRE dashboard (login, auth, all pages, charts)
│   ├── main.tsx         ← React entry point
│   └── index.css        ← Tailwind styles
├── index.html           ← HTML shell
├── package.json         ← Dependencies
├── vite.config.ts       ← Build config
├── tailwind.config.js   ← Tailwind config
├── tsconfig.json        ← TypeScript config
├── .env.example         ← Environment variable template
├── .gitignore           ← Git ignore rules
└── SETUP.md             ← This file
```

---

## STEP 1 — Install on your computer

You need Node.js installed. Download from: https://nodejs.org (LTS version)

Then open a terminal in the project folder and run:

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser. You'll see the login page.

**Demo credentials:**
| Email | Password | Role |
|-------|----------|------|
| admin@pharma.com | admin123 | Executive (all pages) |
| sarah@pharma.com | pm2026 | PM (limited to her dept) |
| viewer@pharma.com | view2026 | Read-only |

---

## STEP 2 — Connect to Google Sheets (Live Data)

1. Go to your Google Sheet with the portfolio data
2. Click **File → Share → Publish to web**
3. Under "Link", select **Sheet1** and **CSV** format
4. Click **Publish** → copy the URL
5. Create a file called `.env` in the project root:

```
VITE_SHEET_URL=https://docs.google.com/spreadsheets/d/YOUR_ID/pub?gid=0&single=true&output=csv
```

6. Restart the dev server: `npm run dev`

The dashboard will now fetch live data from Google Sheets every time it loads.
The fallback data (your original CSV) still works if the sheet is unreachable.

---

## STEP 3 — Push to GitHub

1. Create a free account at https://github.com
2. Create a new repository called `it-portfolio-dashboard` (set to Private)
3. In your terminal inside the project folder:

```bash
git init
git add .
git commit -m "Initial dashboard setup"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/it-portfolio-dashboard.git
git push -u origin main
```

Done! Your code is now on GitHub.

---

## STEP 4 — Deploy Live on Vercel (Free)

1. Go to https://vercel.com and sign up with your GitHub account
2. Click **"Add New Project"**
3. Select your `it-portfolio-dashboard` repository
4. In **Environment Variables**, add:
   - Name: `VITE_SHEET_URL`
   - Value: your Google Sheets CSV URL
5. Click **Deploy**

You'll get a live URL like: `https://it-portfolio-dashboard.vercel.app`

**Auto-deploy:** Every time you push code to GitHub, Vercel automatically rebuilds and redeploys. No manual steps needed.

---

## STEP 5 — Making Changes with Claude

### Option A: Use Claude.ai directly (what you're doing now)
1. Open your `App.tsx` file
2. Copy the section you want to change
3. Paste it into Claude with your request
4. Copy Claude's updated code back into the file
5. `git add . && git commit -m "Updated X" && git push`
6. Vercel auto-deploys within ~60 seconds

### Option B: Use Claude Code (recommended for frequent changes)
Install Claude Code CLI for terminal-based AI editing:
```bash
npm install -g @anthropic-ai/claude-code
cd it-portfolio-dashboard
claude
```
Then just type what you want: "Add a fiscal quarter filter to the executive view"

### Option C: GitHub + Vercel workflow
1. Make changes locally
2. Test with `npm run dev`
3. Push: `git push`
4. Live URL updates in ~1 minute

---

## MANAGING USERS (Access Control)

To add or change users, edit the `USERS` array in `App.tsx`:

```typescript
const USERS: User[] = [
  { email: "newuser@pharma.com", name: "New User", role: "executive", password: "secure123" },
  // roles: "executive" | "pm" | "viewer"
  // for PM role, add dept: "Department Name" to restrict their view
];
```

**Role permissions:**
| Role | Pages Available |
|------|----------------|
| executive | All pages |
| pm | Executive, Department, All Projects (their dept only) |
| viewer | Executive, All Projects |

⚠️ For production, replace this with a real auth service (Supabase, Auth0, Firebase).

---

## UPDATING THE DATA

### Via Google Sheets (recommended):
Just edit your Google Sheet. The dashboard fetches fresh data on every page load.

### Via CSV fallback:
Replace the `FALLBACK_DATA` array in `App.tsx` with new data, then push to GitHub.

---

## QUICK REFERENCE COMMANDS

```bash
npm run dev        # Run locally
npm run build      # Build for production
git add .          # Stage all changes
git commit -m "msg" # Commit with message
git push           # Push to GitHub (triggers Vercel deploy)
```

---

## TROUBLESHOOTING

**Google Sheets not loading?**
- Make sure you published as CSV (not HTML)
- Check that the sheet is publicly accessible (no sign-in required)
- The yellow banner will appear if sheets can't load — fallback data will show

**Vercel build failing?**
- Check the Vercel dashboard for build logs
- Make sure `VITE_SHEET_URL` environment variable is set

**Charts not showing?**
- Make sure `recharts` is installed: `npm install recharts`

---

*IT Portfolio Dashboard · InsightBridge Team 2 · Capstone 2025–2026*
