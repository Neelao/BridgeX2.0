import { Companies, Interviews, Profiles, Reminders, Sessions, Users } from "./db";
import type { Interview, User } from "./types";

export interface ClientView {
  user: User;
  latestInterview?: Interview;
  readiness?: number;
  interviewCount: number;
  hasProfile: boolean;
  targetCompany?: string;
  nextSessionAt?: number;
  lastActivityAt: number;
  daysSinceContact: number | null;
}

const DAY = 24 * 60 * 60 * 1000;

export function clientViews(advisorId: string): ClientView[] {
  return Users.clientsOf(advisorId)
    .map((user) => buildClientView(user))
    .sort((a, b) => (a.readiness ?? 200) - (b.readiness ?? 200));
}

export function buildClientView(user: User): ClientView {
  const interviews = Interviews.forClient(user.id);
  const latest = interviews.find((i) => i.completedAt && i.analysis);
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
