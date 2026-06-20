import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { useStore } from "../../lib/useStore";
import { Reminders, Sessions, Users, uid } from "../../lib/db";
import { fmtDate, fmtDateTime, fmtTime, relative } from "../../lib/format";
import { useToast } from "../../components/Toast";
import { PageHeader } from "../../components/Shell";
import { Calendar } from "../../components/Calendar";
import type { CalendarEvent } from "../../components/Calendar";
import { Avatar, Button, Card, CardHeader, EmptyState, Icon, Input, Pill, Select } from "../../components/ui";
import { Modal } from "../../components/Modal";

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export default function Schedule() {
  const { user } = useAuth();
  const advisorId = user!.id;
  const sessions = useStore(() => Sessions.forAdvisor(advisorId), [advisorId]);
  const reminders = useStore(() => Reminders.forAdvisor(advisorId).filter((r) => !r.done), [advisorId]);

  const [selectedDay, setSelectedDay] = useState<number>(startOfDay(Date.now()));
  const [modalOpen, setModalOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Open the "New session" modal directly when arriving via the sidebar shortcut.
  useEffect(() => {
    if (searchParams.get("new") !== null) {
      setModalOpen(true);
      searchParams.delete("new");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const now = Date.now();
  const events: CalendarEvent[] = [
    ...sessions.map((s) => ({
      id: s.id,
      at: s.when,
      tone: (s.status === "done" || s.when < now ? "done" : "session") as CalendarEvent["tone"],
      label: s.topic,
    })),
    ...reminders.map((r) => ({ id: r.id, at: r.dueAt, tone: "reminder" as const, label: r.text })),
  ];

  const daySessions = sessions.filter((s) => startOfDay(s.when) === selectedDay).sort((a, b) => a.when - b.when);
  const dayReminders = reminders.filter((r) => startOfDay(r.dueAt) === selectedDay);
  const upcoming = sessions.filter((s) => s.status === "scheduled" && s.when >= now).slice(0, 6);

  return (
    <div>
      <PageHeader
        eyebrow="Coaching calendar"
        title="Schedule"
        subtitle="All sessions and follow-ups in one calendar."
        action={<Button icon="plus" onClick={() => setModalOpen(true)}>New session</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="p-5">
            <Calendar events={events} selectedDay={selectedDay} onSelectDay={setSelectedDay} />
          </div>
        </Card>

        <Card>
          <CardHeader title={fmtDate(selectedDay)} icon="calendar" />
          <div className="space-y-3 p-5">
            {daySessions.length === 0 && dayReminders.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">Nothing scheduled this day.</p>
            ) : (
              <>
                {daySessions.map((s) => {
                  const client = Users.byId(s.clientId);
                  const past = s.when < now;
                  return (
                    <div key={s.id} className="flex items-start gap-3">
                      <span className="mt-0.5 w-14 shrink-0 text-xs font-semibold tnum text-ink-700">{fmtTime(s.when)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink-900">{s.topic}</p>
                        <p className="text-xs text-muted">{client?.name ?? "Client"} · {s.durationMins} min</p>
                      </div>
                      {client && (
                        <Link to={`/advisor/clients/${client.id}`} className="text-muted hover:text-ink-700" aria-label="Open client">
                          <Icon name="arrowUpRight" size={15} />
                        </Link>
                      )}
                      {past ? (
                        <button onClick={() => Sessions.upsert({ ...s, status: "done" })} className="text-muted hover:text-sage-600" aria-label="Mark done">
                          <Icon name="check" size={15} />
                        </button>
                      ) : (
                        <button onClick={() => Sessions.remove(s.id)} className="text-muted hover:text-clay-500" aria-label="Cancel">
                          <Icon name="x" size={15} />
                        </button>
                      )}
                    </div>
                  );
                })}
                {dayReminders.map((r) => {
                  const client = Users.byId(r.clientId);
                  return (
                    <div key={r.id} className="flex items-start gap-3">
                      <span className="mt-0.5 w-14 shrink-0"><Pill tone="gold">Due</Pill></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-ink-800">{r.text}</p>
                        <p className="text-xs text-muted">{client?.name ?? "Client"}</p>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
            <Button variant="outline" size="sm" icon="plus" className="w-full" onClick={() => setModalOpen(true)}>
              Schedule on {fmtDate(selectedDay)}
            </Button>
          </div>
        </Card>
      </div>

      {/* Upcoming quick list */}
      <div className="mt-8">
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Next up</h2>
        {upcoming.length === 0 ? (
          <EmptyState title="No upcoming sessions" body="Pick a day on the calendar and schedule a coaching session." />
        ) : (
          <Card>
            <div className="divide-y divide-line">
              {upcoming.map((s) => {
                const client = Users.byId(s.clientId);
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedDay(startOfDay(s.when))}
                    className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition hover:bg-paper-2"
                  >
                    <div className="w-28 shrink-0 text-xs text-muted">{fmtDateTime(s.when)}</div>
                    {client && <Avatar name={client.name} size={34} />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900">{s.topic}</p>
                      <p className="truncate text-xs text-muted">{client?.name ?? "Client"} · {relative(s.when)}</p>
                    </div>
                    <Icon name="chevronRight" size={16} className="text-muted" />
                  </button>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      <NewSessionModal open={modalOpen} advisorId={advisorId} day={selectedDay} onClose={() => setModalOpen(false)} />
    </div>
  );
}

function toLocalInput(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function NewSessionModal({ open, advisorId, day, onClose }: { open: boolean; advisorId: string; day: number; onClose: () => void }) {
  const toast = useToast();
  const clients = useStore(() => Users.clientsOf(advisorId), [advisorId]);
  const [clientId, setClientId] = useState("");
  const [topic, setTopic] = useState("Coaching session");
  const [duration, setDuration] = useState(30);
  // Default to 9:00am on the selected day.
  const defaultWhen = new Date(day);
  defaultWhen.setHours(9, 0, 0, 0);
  const [when, setWhen] = useState(toLocalInput(defaultWhen.getTime()));

  // Keep the date field in sync when the selected day changes while open.
  const dayKey = startOfDay(day);
  const [lastDay, setLastDay] = useState(dayKey);
  if (open && dayKey !== lastDay) {
    setLastDay(dayKey);
    const d = new Date(day);
    d.setHours(9, 0, 0, 0);
    setWhen(toLocalInput(d.getTime()));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const target = clientId || clients[0]?.id;
    if (!target) {
      toast("Add a client first", "error");
      return;
    }
    Sessions.upsert({
      id: uid("ses"),
      advisorId,
      clientId: target,
      when: new Date(when).getTime(),
      durationMins: duration,
      topic: topic.trim() || "Coaching session",
      status: "scheduled",
    });
    Users.touchContact(target);
    toast("Session scheduled");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Schedule a session">
      <form onSubmit={submit} className="space-y-4">
        {clients.length === 0 ? (
          <p className="rounded-xl bg-paper-2 px-4 py-3 text-sm text-muted">You have no clients yet. Add a client first.</p>
        ) : (
          <ClientCombobox clients={clients} value={clientId || clients[0]?.id} onChange={setClientId} />
        )}
        <Input label="Topic" value={topic} onChange={(e) => setTopic(e.target.value)} />
        <Input label="Date & time" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        <Select label="Duration" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
          {[15, 30, 45, 60].map((m) => (
            <option key={m} value={m}>{m} minutes</option>
          ))}
        </Select>
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1" disabled={clients.length === 0}>Schedule</Button>
        </div>
      </form>
    </Modal>
  );
}

function ClientCombobox({
  clients,
  value,
  onChange,
}: {
  clients: ReturnType<typeof Users.clientsOf>;
  value: string;
  onChange: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = clients.find((c) => c.id === value);
  const filtered = clients.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <span className="mb-1.5 block text-[13px] font-medium text-ink-800">Client</span>
      <div className="relative">
        <Icon name="search" size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={open ? query : selected?.name ?? ""}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          placeholder="Search client name…"
          className="w-full rounded-lg border border-line-strong bg-surface py-2.5 pl-10 pr-3.5 text-sm text-ink-900 outline-none transition placeholder:text-muted/70 focus:border-steel-400 focus:ring-2 focus:ring-steel-100"
        />
      </div>
      {open && (
        <div className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-line bg-surface py-1 shadow-lg shadow-black/10 scroll-thin">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted">No clients match.</p>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onChange(c.id);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-center justify-between px-3.5 py-2 text-left text-sm text-ink-800 hover:bg-paper-2"
              >
                {c.name}
                {c.id === value && <Icon name="check" size={15} className="text-steel-600" strokeWidth={2.2} />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
