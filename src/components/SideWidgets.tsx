import { useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../lib/useStore";
import { Reminders, Sessions, Users } from "../lib/db";
import { activityFeed, topMovers } from "../lib/selectors";
import { fmtTime, relative } from "../lib/format";
import { Avatar, Card, CardHeader, Icon } from "./ui";
import type { IconName } from "./Icon";

const DAY = 86400000;

/* ---------- This week (sessions + due follow-ups, next 7 days) ---------- */
export function ThisWeekCard({ advisorId }: { advisorId: string }) {
  const items = useStore(() => {
    const now = Date.now();
    const end = now + 7 * DAY;
    const sessions = Sessions.forAdvisor(advisorId)
      .filter((s) => s.status === "scheduled" && s.when >= now && s.when <= end)
      .map((s) => ({ id: s.id, at: s.when, label: s.topic, clientId: s.clientId, kind: "session" as const }));
    const reminders = Reminders.forAdvisor(advisorId)
      .filter((r) => !r.done && r.dueAt >= now && r.dueAt <= end)
      .map((r) => ({ id: r.id, at: r.dueAt, label: r.text, clientId: r.clientId, kind: "reminder" as const }));
    return [...sessions, ...reminders].sort((a, b) => a.at - b.at).slice(0, 6);
  }, [advisorId]);

  return (
    <Card>
      <CardHeader title="This week" icon="calendar" />
      <div className="p-4">
        {items.length === 0 ? (
          <p className="py-3 text-center text-sm text-muted">Nothing in the next 7 days.</p>
        ) : (
          <div className="space-y-3">
            {items.map((it) => {
              const client = Users.byId(it.clientId);
              return (
                <div key={it.id} className="flex items-start gap-2.5">
                  <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${it.kind === "session" ? "bg-steel-50 text-steel-600" : "bg-gold-50 text-gold-600"}`}>
                    <Icon name={it.kind === "session" ? "calendar" : "bell"} size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink-800">{it.label}</p>
                    <p className="text-xs text-muted">
                      {client?.name ?? "Client"} · {fmtTime(it.at)} · {relative(it.at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <Link to="/advisor/schedule" className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-steel-600 hover:text-steel-700">
          Open calendar <Icon name="arrowRight" size={13} />
        </Link>
      </div>
    </Card>
  );
}

/* ---------- Top movers ---------- */
export function TopMoversCard({ advisorId }: { advisorId: string }) {
  const movers = useStore(() => topMovers(advisorId), [advisorId]);
  if (movers.length === 0) return null;
  return (
    <Card>
      <CardHeader title="Top movers" icon="chart" />
      <div className="space-y-1 p-3">
        {movers.map((v) => {
          const t = v.trend ?? 0;
          return (
            <Link key={v.user.id} to={`/advisor/clients/${v.user.id}`} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-paper-2">
              <Avatar name={v.user.name} size={32} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink-900">{v.user.name}</p>
                <p className="truncate text-xs text-muted">{v.readiness}/100 readiness</p>
              </div>
              <span className={`text-sm font-semibold ${t > 0 ? "text-sage-600" : "text-clay-500"}`}>
                {t > 0 ? "↑" : "↓"}{Math.abs(t)}
              </span>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

/* ---------- Roster activity feed ---------- */
const ACTIVITY_META: Record<string, { icon: IconName; dot: string }> = {
  interview: { icon: "mic", dot: "bg-steel-500" },
  feedback: { icon: "check", dot: "bg-sage-500" },
  note: { icon: "edit", dot: "bg-muted" },
  referral: { icon: "briefcase", dot: "bg-gold-500" },
};

export function ActivityFeedCard({ advisorId }: { advisorId: string }) {
  const items = useStore(() => activityFeed(advisorId, 30), [advisorId]);
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? items : items.slice(0, 5);
  return (
    <Card>
      <CardHeader title="Recent activity" icon="clock" />
      <div className="p-4">
        {items.length === 0 ? (
          <p className="py-3 text-center text-sm text-muted">No activity yet.</p>
        ) : (
          <div className="space-y-3">
            {shown.map((it) => {
              const meta = ACTIVITY_META[it.kind];
              return (
                <Link key={it.id} to={`/advisor/clients/${it.clientId}`} className="flex items-start gap-2.5 rounded-lg px-1 py-1 hover:bg-paper-2">
                  <span className="mt-1 flex items-center">
                    <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink-800">
                      <span className="font-medium text-ink-900">{it.clientName}</span> — {it.text}
                    </p>
                    <p className="text-xs text-muted">{relative(it.at)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        {items.length > 5 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-medium text-steel-600 transition hover:bg-paper-2"
          >
            {expanded ? "View less" : `View ${items.length - 5} more`}
            <Icon name={expanded ? "chevronDown" : "chevronRight"} size={14} className={expanded ? "rotate-180" : ""} />
          </button>
        )}
      </div>
    </Card>
  );
}
