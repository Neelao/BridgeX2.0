# BridgeX 2.0

BridgeX 2.0 — AI-powered platform helping job advisors manage clients smarter. Candidates complete mock interviews analyzed by AI against their CV, giving advisors instant readiness summaries. One dashboard for scheduling, progress tracking, and proactive follow-ups — so advisors spend less time on admin and more time changing careers.

This repo is a **fully working front-end demo** (Vite + React + TypeScript + Tailwind). All data — including the logged-in session — lives in your browser's `localStorage`, so there's no backend or API key to configure. The "AI" runs as a local heuristic engine ([`src/lib/ai.ts`](src/lib/ai.ts)) whose output shape matches a real LLM call, so swapping in the Claude API later is a drop-in change.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

Other scripts: `npm run build` (typecheck + production build), `npm run preview`.

## Demo logins (pre-seeded on first load)

| Role    | Email                | Password     |
| ------- | -------------------- | ------------ |
| Advisor | `advisor@bridgex.io` | `advisor123` |
| Client  | `amir@demo.io`       | `client123`  |
| Client  | `lena@demo.io`       | `client123`  |
| Client  | `sam@demo.io`        | `client123`  |

> Sessions are **per-login and persistent**. Sign in as the advisor, sign out, then sign in as one of their clients in the same browser session — the data stays put. To reset everything, clear the site's `localStorage` (or run `localStorage.clear()` in the console).

## Demo flow

1. **Advisor** signs in → sees the dashboard: morning briefing, follow-up reminders, and a roster sorted by readiness.
2. Advisor opens a client → reads the **AI readiness summary** (score, strengths, gaps, coaching actions, resume suggestions) and the **AI criteria breakdown** of a target company's job description (must-haves, keywords, resume tips).
3. Advisor **adds a new client** → BridgeX generates a login to hand off. No public client sign-up.
4. Advisor **signs out**, then **client signs in** with the handed-off credentials.
5. **Client** updates their profile/CV and runs an **AI mock interview** (chat). On finish they get an instant readiness score + feedback — which flows straight back to the advisor's view.

## Two interfaces

- **Advisor** — `/advisor` dashboard, clients, client detail, schedule.
- **Client (job seeker)** — `/client` overview, profile/CV, mock interview, results.

Role guards keep each user in their own interface; a client can only sign in with credentials an advisor created for them.

## Project structure

```
src/
  lib/        types, localStorage "db", auth context, mock AI engine, seed data, selectors
  components/ Shell (nav), AuthLayout, Modal, shared UI primitives
  pages/
    advisor/  Dashboard, Clients, ClientDetail, Schedule
    client/   Home, Profile, Interview, Results
```

## Going to production

Replace the localStorage layer ([`src/lib/db.ts`](src/lib/db.ts)) with Supabase (Auth + Postgres) and swap the heuristic functions in [`src/lib/ai.ts`](src/lib/ai.ts) for Claude API calls. The component layer doesn't need to change — it only talks to those two modules.
