import { Companies, Interviews, Notes, Opportunities, Profiles, Referrals, Reminders, Sessions, Users } from "./db";
import type { MatchContext } from "./ai";
import type { Interview, ReferralStatus, User } from "./types";

export function matchContextFor(user: User): MatchContext {
  return {
    user,
    profile: Profiles.forClient(user.id),
    analysis: Interviews.latestComplete(user.id)?.analysis,
    targets: Companies.forClient(user.id),
  };
}

export interface ClientView {
  user: User;
  latestInterview?: Interview;
  readiness?: number;
  trend: number | null; // change vs previous interview
  interviewCount: number;
  hasProfile: boolean;
  targetCompany?: string;
  nextSessionAt?: number;
  lastActivityAt: number;
  daysSinceContact: number | null;
}

const DAY = 24 * 60 * 60 * 1000;

export type Segment = "improving" | "struggling" | "referral-ready" | "inactive";

export function segmentsOf(v: ClientView): Segment[] {
  const segs: Segment[] = [];
  if (v.trend !== null && v.trend >= 5) segs.push("improving");
  if ((typeof v.readiness === "number" && v.readiness < 60) || (v.trend !== null && v.trend <= -5)) segs.push("struggling");
  if (v.user.readinessStatus === "employer_ready" || (typeof v.readiness === "number" && v.readiness >= 80))
    segs.push("referral-ready");
  const idleDays = (Date.now() - v.lastActivityAt) / DAY;
  if (idleDays >= 14 && (v.daysSinceContact ?? 0) >= 14) segs.push("inactive");
  return segs;
}

export function clientViews(advisorId: string): ClientView[] {
  return Users.clientsOf(advisorId)
    .map((user) => buildClientView(user))
    .sort((a, b) => (a.readiness ?? 200) - (b.readiness ?? 200));
}

export function buildClientView(user: User): ClientView {
  const interviews = Interviews.forClient(user.id);
  const scored = interviews.filter((i) => i.completedAt && i.analysis);
  const latest = scored[0];
  const prev = scored[1];
  const trend =
    latest?.analysis && prev?.analysis ? latest.analysis.readinessScore - prev.analysis.readinessScore : null;
  const profile = Profiles.forClient(user.id);
  const companies = Companies.forClient(user.id);
  const nextSession = Sessions.forClient(user.id).find(
    (s) => s.status === "scheduled" && s.when > Date.now()
  );
  const lastActivityAt = Math.max(
    user.createdAt,
    profile?.updatedAt ?? 0,
    interviews[0]?.startedAt ?? 0
  );
  const contactRef = user.lastContactAt ?? user.createdAt;
  return {
    user,
    latestInterview: latest,
    readiness: latest?.analysis?.readinessScore,
    trend,
    interviewCount: interviews.filter((i) => i.completedAt).length,
    hasProfile: !!profile && profile.cvText.trim().length > 0,
    targetCompany: companies[0]?.company,
    nextSessionAt: nextSession?.when,
    lastActivityAt,
    daysSinceContact: Math.floor((Date.now() - contactRef) / DAY),
  };
}

export interface RosterStats {
  total: number;
  ready: number;
  needsWork: number;
  avgReadiness: number | null;
  openReminders: number;
  upcomingSessions: number;
}

export interface AttentionItem {
  id: string;
  clientId: string;
  clientName: string;
  text: string;
  tone: "warn" | "info" | "good";
  kind: "session" | "overdue" | "coaching" | "no-interview" | "stale";
}

/**
 * The advisor's "what needs me right now" feed — drives the notifications bell
 * and keeps client attention from slipping. Ordered by urgency.
 */
export function attentionItems(advisorId: string): AttentionItem[] {
  const items: AttentionItem[] = [];
  const views = clientViews(advisorId);
  const now = Date.now();

  for (const r of Reminders.forAdvisor(advisorId).filter((x) => !x.done && x.dueAt < now)) {
    const c = Users.byId(r.clientId);
    if (!c) continue;
    items.push({
      id: `ov_${r.id}`,
      clientId: r.clientId,
      clientName: c.name,
      text: `Overdue follow-up: ${r.text}`,
      tone: "warn",
      kind: "overdue",
    });
  }

  for (const s of Sessions.forAdvisor(advisorId).filter((x) => x.status === "scheduled" && x.when > now && x.when < now + 2 * DAY)) {
    const c = Users.byId(s.clientId);
    if (!c) continue;
    items.push({
      id: `se_${s.id}`,
      clientId: s.clientId,
      clientName: c.name,
      text: `Session soon — ${s.topic}`,
      tone: "info",
      kind: "session",
    });
  }

  for (const v of views) {
    if (typeof v.readiness === "number" && v.readiness < 60) {
      items.push({
        id: `co_${v.user.id}`,
        clientId: v.user.id,
        clientName: v.user.name,
        text: `Low readiness (${v.readiness}/100) — needs coaching`,
        tone: "warn",
        kind: "coaching",
      });
    }
    if (v.interviewCount === 0) {
      items.push({
        id: `ni_${v.user.id}`,
        clientId: v.user.id,
        clientName: v.user.name,
        text: "No mock interview yet — nudge them to start",
        tone: "info",
        kind: "no-interview",
      });
    } else if ((v.daysSinceContact ?? 0) >= 7) {
      items.push({
        id: `st_${v.user.id}`,
        clientId: v.user.id,
        clientName: v.user.name,
        text: `No contact in ${v.daysSinceContact} days — check in`,
        tone: "info",
        kind: "stale",
      });
    }
  }

  const order = { overdue: 0, session: 1, coaching: 2, "no-interview": 3, stale: 4 } as const;
  return items.sort((a, b) => order[a.kind] - order[b.kind]);
}

/* -------- Roster activity feed -------- */
export interface ActivityItem {
  id: string;
  clientId: string;
  clientName: string;
  text: string;
  kind: "interview" | "note" | "feedback" | "referral";
  at: number;
}

export function activityFeed(advisorId: string, limit = 8): ActivityItem[] {
  const clients = Users.clientsOf(advisorId);
  const nameById = new Map(clients.map((c) => [c.id, c.name]));
  const items: ActivityItem[] = [];

  for (const c of clients) {
    for (const iv of Interviews.forClient(c.id)) {
      if (iv.completedAt && iv.analysis)
        items.push({ id: `iv_${iv.id}`, clientId: c.id, clientName: c.name, text: `Completed a mock interview · ${iv.analysis.readinessScore}/100`, kind: "interview", at: iv.completedAt });
    }
    for (const n of Notes.forClient(c.id)) {
      items.push(
        n.shared
          ? { id: `nt_${n.id}`, clientId: c.id, clientName: c.name, text: "You shared feedback", kind: "feedback", at: n.at }
          : { id: `nt_${n.id}`, clientId: c.id, clientName: c.name, text: "Coaching note added", kind: "note", at: n.at }
      );
    }
  }
  for (const r of Referrals.forAdvisor(advisorId)) {
    if (!nameById.has(r.clientId)) continue;
    const opp = Opportunities.byId(r.opportunityId);
    items.push({ id: `rf_${r.id}`, clientId: r.clientId, clientName: nameById.get(r.clientId)!, text: `Referral to ${opp?.org ?? "an employer"} · ${r.status}`, kind: "referral", at: r.at });
  }

  return items.sort((a, b) => b.at - a.at).slice(0, limit);
}

/* -------- Top movers (biggest readiness change) -------- */
export function topMovers(advisorId: string, limit = 4): ClientView[] {
  return clientViews(advisorId)
    .filter((v) => v.trend !== null && v.trend !== 0)
    .sort((a, b) => Math.abs(b.trend ?? 0) - Math.abs(a.trend ?? 0))
    .slice(0, limit);
}

/* -------- Referral pipeline funnel -------- */
export interface ReferralFunnel {
  counts: Record<ReferralStatus, number>;
  total: number;
  placedThisMonth: number;
}

export function referralFunnel(advisorId: string): ReferralFunnel {
  const refs = Referrals.forAdvisor(advisorId);
  const counts: Record<ReferralStatus, number> = { suggested: 0, sent: 0, interviewing: 0, placed: 0, declined: 0 };
  for (const r of refs) counts[r.status]++;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const placedThisMonth = refs.filter((r) => r.status === "placed" && r.at >= monthStart.getTime()).length;
  return { counts, total: refs.length, placedThisMonth };
}

export function rosterStats(advisorId: string): RosterStats {
  const views = clientViews(advisorId);
  const scored = views.filter((v) => typeof v.readiness === "number");
  const avg = scored.length
    ? Math.round(scored.reduce((s, v) => s + (v.readiness ?? 0), 0) / scored.length)
    : null;
  const openReminders = Reminders.forAdvisor(advisorId).filter((r) => !r.done).length;
  const upcomingSessions = Sessions.forAdvisor(advisorId).filter(
    (s) => s.status === "scheduled" && s.when > Date.now()
  ).length;
  return {
    total: views.length,
    ready: scored.filter((v) => (v.readiness ?? 0) >= 80).length,
    needsWork: scored.filter((v) => (v.readiness ?? 0) < 60).length,
    avgReadiness: avg,
    openReminders,
    upcomingSessions,
  };
}
