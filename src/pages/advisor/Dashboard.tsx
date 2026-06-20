import { Link } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { useStore } from "../../lib/useStore";
import { clientViews, rosterStats, segmentsOf } from "../../lib/selectors";
import { Reminders, Sessions, Users } from "../../lib/db";
import { fmtDateTime, relative } from "../../lib/format";
import type { IconName } from "../../components/Icon";
import { PageHeader } from "../../components/Shell";
import { AiBadge, Button, Card, CardHeader, EmptyState, Icon, LinkArrow, Stat } from "../../components/ui";
import { ClientCard } from "../../components/ClientCard";
import { ActivityFeedCard, CoachingTipCard, QuickActionsCard, ThisWeekCard, TopMoversCard } from "../../components/SideWidgets";

export default function Dashboard() {
  const { user } = useAuth();
  const advisorId = user!.id;

  const views = useStore(() => clientViews(advisorId), [advisorId]);
  const stats = useStore(() => rosterStats(advisorId), [advisorId]);
  const reminders = useStore(() => Reminders.forAdvisor(advisorId), [advisorId]);
  const sessions = useStore(
    () => Sessions.forAdvisor(advisorId).filter((s) => s.status === "scheduled" && s.when > Date.now()),
    [advisorId]
  );

  const briefing = buildBriefing(views, sessions, reminders);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  function toggleReminder(id: string, done: boolean) {
    const r = reminders.find((x) => x.id === id);
    if (r) Reminders.upsert({ ...r, done });
  }

  return (
    <div>
      <PageHeader
        eyebrow={`${user!.agency ?? "BridgeX"} · Roster overview`}
        title={
          <>
            {greeting}, {user!.name.split(" ")[0]}.
          </>
        }
        subtitle="Here's what needs your attention today."
        action={
          <Link to="/advisor/clients">
            <Button icon="plus">Add client</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Active clients" value={stats.total} sub={`${stats.upcomingSessions} sessions upcoming`} />
        <Stat
          label="Avg. readiness"
          value={stats.avgReadiness !== null ? `${stats.avgReadiness}` : "—"}
          sub="across scored clients"
        />
        <Stat label="Interview-ready" value={stats.ready} sub="scored 80 and above" />
        <Stat label="Need coaching" value={stats.needsWork} sub="scored below 60" />
      </div>

      {/* Daily overview — progress monitoring at a glance */}
      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(() => {
          const DAY = 86400000;
          const now = Date.now();
          const glance = [
            { label: "New candidates", n: views.filter((v) => now - v.user.createdAt <= 7 * DAY).length, sub: "joined this week", to: "/advisor/clients", tone: "steel" as const },
            { label: "Needs attention", n: views.filter((v) => { const s = segmentsOf(v); return s.includes("struggling") || s.includes("inactive") || v.user.readinessStatus === "not_ready"; }).length, sub: "struggling / inactive", to: "/advisor/clients", tone: "clay" as const },
            { label: "High performers", n: views.filter((v) => segmentsOf(v).includes("referral-ready")).length, sub: "referral-ready", to: "/advisor/referrals", tone: "sage" as const },
            { label: "Follow-up tasks", n: stats.openReminders + stats.upcomingSessions, sub: "reminders + sessions", to: "/advisor/schedule", tone: "gold" as const },
          ];
          const dot: Record<string, string> = { steel: "bg-steel-500", clay: "bg-clay-500", sage: "bg-sage-500", gold: "bg-gold-500" };
          return glance.map((g) => (
            <Link key={g.label} to={g.to} className="group rounded-2xl border border-line bg-surface px-5 py-4 shadow-[0_1px_2px_rgba(20,22,30,0.04)] transition hover:border-line-strong hover:shadow-md">
              <div className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${dot[g.tone]}`} />
                <p className="text-[12px] font-medium text-muted">{g.label}</p>
              </div>
              <p className="mt-1.5 text-[28px] font-semibold leading-none tnum text-ink-900">{g.n}</p>
              <p className="mt-1.5 flex items-center gap-1 text-xs text-muted">
                {g.sub}
                <Icon name="arrowRight" size={12} className="opacity-0 transition group-hover:opacity-100" />
              </p>
            </Link>
          ));
        })()}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Morning briefing" icon="sparkle" action={<AiBadge />} />
            <div className="divide-y divide-line">
              {briefing.length === 0 && (
                <p className="px-5 py-10 text-center text-sm text-muted">All clear. Add a client to get started.</p>
              )}
              {briefing.map((b, i) => (
                <div key={i} className="flex items-start gap-3.5 px-5 py-3.5">
                  <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${TONE_BG[b.tone]}`}>
                    <Icon name={b.icon} size={15} />
                  </span>
                  <div className="flex-1 text-sm">
                    <p className="leading-relaxed text-ink-800">{b.text}</p>
                    {b.clientId && (
                      <Link to={`/advisor/clients/${b.clientId}`} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-steel-600 hover:text-steel-700">
                        View {b.clientName}
                        <Icon name="arrowRight" size={12} />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Roster */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Client readiness</h2>
              <LinkArrow to="/advisor/clients">View all clients</LinkArrow>
            </div>
            {views.length === 0 ? (
              <EmptyState
                title="No clients yet"
                body="Create a client account to give a job seeker access and start tracking readiness."
                action={<Link to="/advisor/clients"><Button icon="plus">Add your first client</Button></Link>}
              />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                {views.slice(0, 4).map((v, i) => (
                  <ClientCard key={v.user.id} view={v} index={i} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right rail */}
        <div className="space-y-6">
          <ThisWeekCard advisorId={advisorId} />

          {/* Follow-up reminders */}
          <Card>
            <CardHeader title="Follow-ups" icon="bell" />
            <div className="p-2.5">
              {reminders.length === 0 && <p className="px-2 py-8 text-center text-sm text-muted">No reminders.</p>}
              {reminders.map((r) => {
                const client = Users.byId(r.clientId);
                const overdue = !r.done && r.dueAt < Date.now();
                return (
                  <label key={r.id} className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 hover:bg-paper-2">
                    <input
                      type="checkbox"
                      checked={r.done}
                      onChange={(e) => toggleReminder(r.id, e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-line-strong text-steel-500 focus:ring-steel-200"
                    />
                    <span className="flex-1 text-sm">
                      <span className={r.done ? "text-muted line-through" : "text-ink-800"}>{r.text}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        {client && <span className="text-muted">{client.name}</span>}
                        {r.source === "ai" && <AiBadge />}
                        <span className={overdue ? "font-semibold text-clay-500" : "text-muted"}>{relative(r.dueAt)}</span>
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </Card>

          <TopMoversCard advisorId={advisorId} />
          <ActivityFeedCard advisorId={advisorId} />
          <QuickActionsCard />
          <CoachingTipCard />
        </div>
      </div>
    </div>
  );
}

const TONE_BG: Record<string, string> = {
  good: "bg-sage-50 text-sage-600",
  warn: "bg-clay-50 text-clay-500",
  info: "bg-steel-50 text-steel-600",
};

interface BriefLine {
  icon: IconName;
  tone: "good" | "warn" | "info";
  text: string;
  clientId?: string;
  clientName?: string;
}

function buildBriefing(
  views: ReturnType<typeof clientViews>,
  sessions: ReturnType<typeof Sessions.forAdvisor>,
  reminders: ReturnType<typeof Reminders.forAdvisor>
): BriefLine[] {
  const lines: BriefLine[] = [];

  for (const s of sessions.slice(0, 2)) {
    const client = Users.byId(s.clientId);
    lines.push({
      icon: "calendar",
      tone: "info",
      text: `Session with ${client?.name ?? "a client"} ${relative(s.when)} (${fmtDateTime(s.when)}) — ${s.topic}.`,
      clientId: s.clientId,
      clientName: client?.name,
    });
  }

  const overdue = reminders.filter((r) => !r.done && r.dueAt < Date.now());
  if (overdue.length) {
    lines.push({
      icon: "alert",
      tone: "warn",
      text: `${overdue.length} follow-up${overdue.length > 1 ? "s are" : " is"} overdue.`,
    });
  }

  for (const v of views.filter((v) => typeof v.readiness === "number" && v.readiness! < 60).slice(0, 2)) {
    lines.push({
      icon: "target",
      tone: "warn",
      text: `${v.user.name} scored ${v.readiness}/100 — prioritise coaching before applying${v.targetCompany ? ` to ${v.targetCompany}` : ""}.`,
      clientId: v.user.id,
      clientName: v.user.name,
    });
  }

  for (const v of views.filter((v) => v.interviewCount === 0).slice(0, 2)) {
    lines.push({
      icon: "mic",
      tone: "info",
      text: `${v.user.name} hasn't completed a mock interview yet — nudge them to start one.`,
      clientId: v.user.id,
      clientName: v.user.name,
    });
  }

  for (const v of views.filter((v) => typeof v.readiness === "number" && v.readiness! >= 80).slice(0, 1)) {
    lines.push({
      icon: "check",
      tone: "good",
      text: `${v.user.name} is interview-ready (${v.readiness}/100). Good time to finalise their resume and apply.`,
      clientId: v.user.id,
      clientName: v.user.name,
    });
  }

  return lines;
}
