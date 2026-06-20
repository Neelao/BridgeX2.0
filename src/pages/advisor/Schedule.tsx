import { Link } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { useStore } from "../../lib/useStore";
import { Sessions, Users } from "../../lib/db";
import { fmtDate, fmtTime, relative } from "../../lib/format";
import { PageHeader } from "../../components/Shell";
import { Avatar, Button, Card, EmptyState, Icon, Pill } from "../../components/ui";

export default function Schedule() {
  const { user } = useAuth();
  const advisorId = user!.id;
  const sessions = useStore(() => Sessions.forAdvisor(advisorId), [advisorId]);

  const now = Date.now();
  const upcoming = sessions.filter((s) => s.status === "scheduled" && s.when >= now);
  const past = sessions.filter((s) => s.status === "done" || s.when < now).reverse();

  const groups = new Map<string, typeof upcoming>();
  for (const s of upcoming) {
    const key = fmtDate(s.when);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }

  return (
    <div>
      <PageHeader eyebrow="Coaching calendar" title="Schedule" subtitle="All coaching sessions across your clients." />

      {upcoming.length === 0 && past.length === 0 ? (
        <EmptyState
          title="No sessions scheduled"
          body="Open a client and schedule a coaching session — it'll show up here."
          action={<Link to="/advisor/clients"><Button>Go to clients</Button></Link>}
        />
      ) : (
        <div className="space-y-8">
          <div>
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Upcoming</h2>
            {upcoming.length === 0 ? (
              <Card>
                <p className="px-5 py-8 text-center text-sm text-muted">Nothing upcoming.</p>
              </Card>
            ) : (
              <div className="space-y-5">
                {[...groups.entries()].map(([day, items]) => (
                  <div key={day}>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{day}</p>
                    <Card>
                      <div className="divide-y divide-line">
                        {items.map((s) => {
                          const client = Users.byId(s.clientId);
                          return (
                            <div key={s.id} className="flex items-center gap-4 px-5 py-3.5">
                              <div className="w-14 shrink-0 text-sm font-semibold tnum text-ink-800">{fmtTime(s.when)}</div>
                              {client && <Avatar name={client.name} size={36} />}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-ink-900">{s.topic}</p>
                                <p className="truncate text-xs text-muted">{client?.name ?? "Client"} · {s.durationMins} min · {relative(s.when)}</p>
                              </div>
                              {client && (
                                <Link to={`/advisor/clients/${client.id}`} className="hidden text-[13px] font-semibold text-steel-600 hover:text-steel-700 sm:inline">
                                  Open
                                </Link>
                              )}
                              <button onClick={() => Sessions.remove(s.id)} className="text-muted transition hover:text-clay-500" aria-label="Cancel session">
                                <Icon name="x" size={16} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </div>

          {past.length > 0 && (
            <div>
              <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Past</h2>
              <Card>
                <div className="divide-y divide-line">
                  {past.map((s) => {
                    const client = Users.byId(s.clientId);
                    return (
                      <div key={s.id} className="flex items-center gap-4 px-5 py-3 opacity-70">
                        <div className="w-14 shrink-0 text-xs text-muted">{fmtDate(s.when)}</div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-ink-700">{s.topic}</p>
                          <p className="truncate text-xs text-muted">{client?.name ?? "Client"}</p>
                        </div>
                        <Pill>Done</Pill>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
