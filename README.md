# BridgeX

BridgeX is an AI-powered career advisory platform that acts as an intelligent copilot for advisors, automating interview assessments, tracking client readiness, and enabling personalized coaching at scale.

This repo is a **fully working front-end demo** (Vite + React + TypeScript + Tailwind). All data — including the logged-in session — lives in your browser's `localStorage`, so there's no backend or API key to configure. The "AI" runs as a local heuristic engine ([`src/lib/ai.ts`](src/lib/ai.ts)) whose output shape matches a real LLM call, so swapping in the Claude API later is a drop-in change.

## Team

**Team Name:** Alpha

**Team Members:**
- Renee Lau Qian Yu
- Ng Lek Tse
- Toh Carleen
- Kowaii Kok Xin Ning

## Technologies Used

TypeScript, React, CSS, HTML

## Challenge and Approach

**Challenge:** Career advisors are overwhelmed by administrative work, fragmented tools, and manual candidate management, limiting their ability to effectively support growing numbers of job seekers.

**Approach:** BridgeX combines AI interviews, automated performance analysis, progress tracking, and advisor dashboards into a single platform that helps advisors support more candidates with less administrative effort.

## Demo Video

[Watch the demo on YouTube](https://youtu.be/BfTr9jSn3Wo?si=jfTLYegq9v5cWLmQ)

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

## Usage Instructions

See the [demo video](https://youtu.be/BfTr9jSn3Wo?si=jfTLYegq9v5cWLmQ) for a full walkthrough, or follow the steps below:

1. **Sign in** using one of the [demo logins](#demo-logins-pre-seeded-on-first-load) above — start as the **advisor** to see the platform from the coach's side.
2. **Advisor dashboard** — view the morning briefing, follow-up reminders, and a client roster sorted by interview readiness.
3. **Open a client** to read their **AI readiness summary** (score, strengths, gaps, coaching actions, resume suggestions) and the **AI criteria breakdown** of a target company's job description (must-haves, keywords, resume tips).
4. **Add a new client** — BridgeX generates login credentials for the advisor to hand off. There is no public client sign-up.
5. **Sign out**, then **sign back in as a client** using the handed-off (or demo) credentials.
6. As a **client**, update your profile/CV and run an **AI mock interview** (chat-based). On finishing, you get an instant readiness score and feedback, which flows straight back to the advisor's dashboard.

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
