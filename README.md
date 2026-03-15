# IT Portfolio Dashboard

A role-based project portfolio management dashboard built for a pharma company. Built with React, TypeScript, and Tailwind CSS.

## Features

- **Role-based access control** — Executive, Project Manager, and Viewer roles with scoped data and navigation
- **Executive View** — KPI cards, portfolio health (RAG), risk distribution, strategic mix (Run/Grow/Transform), and phase breakdown charts
- **Department Drill-Down** — Per-department health stats with click-to-drill project tables
- **Project Manager View** — Workload and health breakdown per PM
- **Financial Summary** — Budget analysis by department, priority, and RGT category
- **All Projects Table** — Searchable, filterable project list
- **Live Google Sheets integration** — Fetches CSV data on load; falls back to built-in data if unavailable
- **Global filters** — Filter by department, priority, and health status across all views

## Tech Stack

- [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [Recharts](https://recharts.org/) for data visualization
- [Tailwind CSS](https://tailwindcss.com/) for styling

## Getting Started

### Install dependencies

```bash
npm install
```

### Run locally

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

## Google Sheets Integration

To connect live data:

1. Upload your project data to Google Sheets
2. Go to **File → Share → Publish to web → Sheet1 → CSV → Publish**
3. Copy the published URL
4. Create a `.env` file in the project root:

```env
VITE_SHEET_URL=https://docs.google.com/spreadsheets/d/YOUR_ID/pub?output=csv
```

The dashboard will fetch live data on every page load. If the URL is not set or the fetch fails, it falls back to the built-in sample data.

### Expected CSV Column Headers

| Column | Description |
|---|---|
| Project Name | Name of the project |
| Department | Owning department |
| Health Status | `Green`, `Yellow`, or `Red` |
| Priority | `High`, `Medium`, or `Low` |
| Project Phase | `Discovery`, `Planning`, `Execution`, `Validation`, or `Closeout` |
| High Level Budget ($M) | Budget in millions |
| Project Manager | PM full name |
| Risk Level | `High`, `Medium`, or `Low` |
| Run/Grow/Transform | Strategic classification |
| VP Sponsor | VP sponsor name |
| IT Business Partner | IT BP name |
| Estimated Start Date | `YYYY-MM-DD` |
| Estimated End Date | `YYYY-MM-DD` |

## Demo Accounts

| Email | Password | Role |
|---|---|---|
| admin@pharma.com | admin123 | Executive |
| executive@pharma.com | exec2026 | Executive |
| sarah@pharma.com | pm2026 | PM (Enterprise PMO) |
| mark@pharma.com | pm2026 | PM (CMC / Manufacturing) |
| viewer@pharma.com | view2026 | Viewer |

> **Note:** These are demo credentials hardcoded for prototyping. Replace with a real auth service before production use.

## Project

InsightBridge Team 2 · Capstone 2025–2026
