import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { useStore } from "../../lib/useStore";
import { Companies, Interviews, Messages, Notes, Profiles, Reminders, Resumes, Sessions, Users, uid } from "../../lib/db";
import { aiDelay, candidateSummary, summarizeCompany } from "../../lib/ai";
import { fmtDate, fmtDateTime, relative, READINESS_META } from "../../lib/format";
import type { NoteKind, ReadinessStatus, TargetCompany, User } from "../../lib/types";
import { useToast } from "../../components/Toast";
import { PageHeader, BackLink } from "../../components/Shell";
import {
  AiBadge,
  Avatar,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Icon,
  Input,
  Meter,
  Pill,
  ReadinessTag,
  ScoreRing,
  Select,
  Textarea,
} from "../../components/ui";
import { Modal } from "../../components/Modal";

export default function ClientDetail() {
  const { clientId = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const advisorId = user!.id;

  const client = useStore(() => Users.byId(clientId), [clientId]);
  const profile = useStore(() => Profiles.forClient(clientId), [clientId]);
  const interviews = useStore(() => Interviews.forClient(clientId).filter((i) => i.completedAt), [clientId]);
  const companies = useStore(() => Companies.forClient(clientId), [clientId]);
  const sessions = useStore(() => Sessions.forClient(clientId).filter((s) => s.status === "scheduled"), [clientId]);
  const notes = useStore(() => Notes.forClient(clientId), [clientId]);
  const resume = useStore(() => Resumes.forClient(clientId), [clientId]);
  const conversation = useStore(() => Messages.forConversation(advisorId, clientId), [advisorId, clientId]);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [remindOpen, setRemindOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  if (!client || client.advisorId !== advisorId) {
    return (
      <div>
        <BackLink to="/advisor/clients">All clients</BackLink>
        <EmptyState title="Client not found" body="This client doesn't exist on your roster." action={<Link to="/advisor/clients"><Button>Back to clients</Button></Link>} />
      </div>
    );
  }

  const scored = interviews.filter((i) => i.analysis);
  const latest = scored[0];
  const analysis = latest?.analysis;
  const summary = candidateSummary(client, profile, analysis, companies);

  return (
    <div>
      <BackLink to="/advisor/clients">All clients</BackLink>

      <PageHeader
        eyebrow={`${client.targetRole ?? "No target role"} · ${client.email}`}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {client.name}
            {client.readinessStatus && <ReadinessTag status={client.readinessStatus} />}
          </span>
        }
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" icon="calendar" onClick={() => setScheduleOpen(true)}>
              Schedule
            </Button>
            <Button variant="outline" icon="bell" onClick={() => setRemindOpen(true)}>
              Remind me
            </Button>
            <Button variant="outline" icon="settings" onClick={() => setManageOpen(true)}>
              Manage
            </Button>
          </div>
        }
      />

      {/* Readiness approval gate */}
      <ApprovalBar client={client} readiness={analysis?.readinessScore} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* AI candidate summary */}
          <Card>
            <CardHeader title="AI candidate summary" icon="sparkle" action={<AiBadge />} />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <SummaryBlock label="Background" body={summary.background} />
              <SummaryBlock label="Career goals" body={summary.careerGoals} />
              <SummaryListBlock label="Strengths" tone="sage" icon="check" items={summary.strengths} />
              <SummaryListBlock label="Weaknesses" tone="gold" icon="alert" items={summary.weaknesses} />
              <div className="sm:col-span-2">
                <SummaryListBlock label="Areas needing support" tone="steel" icon="target" items={summary.supportAreas} />
              </div>
            </div>
          </Card>

          {/* Interview performance analytics */}
          {analysis && (
            <Card>
              <CardHeader title="Interview performance analytics" icon="chart" action={<AiBadge />} />
              <div className="p-5">
                <div className="grid gap-4 sm:grid-cols-3">
                  <DimScore label="Communication" value={analysis.communication} />
                  <DimScore label="Confidence" value={analysis.confidence} />
                  <DimScore label="Technical" value={analysis.technical} />
                </div>
                <TrendStrip interviews={scored} />
              </div>
            </Card>
          )}

          {/* Readiness summary */}
          <Card>
            <CardHeader title="Readiness summary" icon="chart" action={<AiBadge />} />
            {analysis ? (
              <div className="p-5">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                  <ScoreRing score={analysis.readinessScore} size={92} />
                  <div className="flex-1">
                    <p className="text-sm leading-relaxed text-ink-800">{analysis.summary}</p>
                    <p className="mt-2 text-xs text-muted">
                      From mock interview on {fmtDate(latest!.startedAt)} · {interviews.length} completed
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <InsightList title="Strengths" tone="sage" icon="check" items={analysis.strengths} />
                  <InsightList title="Gaps to coach" tone="gold" icon="alert" items={analysis.gaps} />
                </div>

                <div className="mt-5 rounded-lg border border-steel-100 bg-steel-50 p-4">
                  <p className="mb-2.5 flex items-center gap-2 text-[13px] font-semibold text-steel-700">
                    <Icon name="target" size={15} />
                    Coaching actions for you
                  </p>
                  <ul className="space-y-2">
                    {analysis.coachingActions.map((a, i) => (
                      <li key={i} className="flex gap-2.5 text-sm text-ink-800">
                        <Icon name="chevronRight" size={14} className="mt-0.5 shrink-0 text-steel-500" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 rounded-lg border border-line p-4">
                  <p className="mb-2.5 flex items-center gap-2 text-[13px] font-semibold text-ink-800">
                    <Icon name="file" size={15} className="text-muted" />
                    Resume suggestions
                  </p>
                  <ul className="space-y-2">
                    {analysis.resumeSuggestions.map((a, i) => (
                      <li key={i} className="flex gap-2.5 text-sm text-ink-800">
                        <Icon name="chevronRight" size={14} className="mt-0.5 shrink-0 text-muted" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>

                <details className="group mt-4">
                  <summary className="flex cursor-pointer items-center gap-1.5 text-[13px] font-semibold text-steel-600 hover:text-steel-700">
                    <Icon name="chevronRight" size={14} className="transition-transform group-open:rotate-90" />
                    View interview transcript
                  </summary>
                  <div className="mt-3 space-y-3.5 rounded-lg bg-paper-2 p-4">
                    {latest!.messages.map((m) => (
                      <div key={m.id} className={m.role === "interviewer" ? "" : "border-l-2 border-steel-200 pl-3"}>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                          {m.role === "interviewer" ? "Interviewer" : client.name}
                        </p>
                        <p className="mt-0.5 text-sm text-ink-800">{m.text}</p>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            ) : (
              <div className="p-5">
                <EmptyState
                  title="No mock interview yet"
                  body={`${client.name} hasn't completed an AI mock interview. Once they do, you'll see an instant readiness score and coaching plan here.`}
                />
              </div>
            )}
          </Card>

          {/* Target companies */}
          <Card>
            <CardHeader
              title="Target companies"
              icon="briefcase"
              action={<Button size="sm" variant="outline" icon="plus" onClick={() => setCompanyOpen(true)}>Add target</Button>}
            />
            <div className="p-5">
              {companies.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted">
                  Add a company and job description to get an AI breakdown of its criteria for resume tailoring.
                </p>
              ) : (
                <div className="space-y-4">
                  {companies.map((c) => (
                    <CompanyCard key={c.id} company={c} />
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Resume workspace CTA */}
          <Card>
            <CardHeader title="Resume workspace" icon="file" action={<AiBadge />} />
            <div className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-ink-800">
                  {resume
                    ? `Draft last updated ${fmtDate(resume.updatedAt)} · ${resume.skills.length} skills highlighted.`
                    : "Build a tailored resume from this client's CV, interview analysis, and a target role's criteria — AI drafts it, you refine it."}
                </p>
                {resume && <p className="mt-1 text-xs text-muted line-clamp-2">{resume.summary}</p>}
              </div>
              <Button
                icon={resume ? "edit" : "sparkle"}
                variant={resume ? "outline" : "accent"}
                className="shrink-0"
                onClick={() => navigate(`/advisor/clients/${clientId}/resume`)}
              >
                {resume ? "Open workspace" : "Draft with AI"}
              </Button>
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Profile & CV" icon="file" />
            <div className="space-y-3 p-5 text-sm">
              <Row label="Headline" value={profile?.headline} />
              <Row label="Location" value={profile?.location} />
              <Row label="Experience" value={profile ? `${profile.yearsExperience} yrs` : undefined} />
              <Row label="Phone" value={profile?.phone} />
              <div className="border-t border-line pt-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">CV</p>
                {profile?.cvText ? (
                  <details className="group mt-1.5">
                    <summary className="flex cursor-pointer items-center gap-1.5 text-sm font-medium text-steel-600">
                      <Icon name="file" size={14} />
                      {profile.cvFileName ?? "View CV"}
                    </summary>
                    <p className="mt-2 whitespace-pre-wrap rounded-lg bg-paper-2 p-3 text-xs leading-relaxed text-ink-700">
                      {profile.cvText}
                    </p>
                  </details>
                ) : (
                  <div className="mt-1.5"><Pill tone="clay">Not uploaded</Pill></div>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Upcoming sessions" icon="calendar" />
            <div className="p-3">
              {sessions.length === 0 ? (
                <p className="px-2 py-4 text-center text-sm text-muted">None scheduled.</p>
              ) : (
                sessions.map((s) => (
                  <div key={s.id} className="flex items-start justify-between gap-2 rounded-lg px-2 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-ink-800">{s.topic}</p>
                      <p className="text-xs text-muted">{fmtDateTime(s.when)} · {s.durationMins} min · {relative(s.when)}</p>
                    </div>
                    <button onClick={() => Sessions.remove(s.id)} className="text-xs text-muted transition hover:text-clay-500">
                      Cancel
                    </button>
                  </div>
                ))
              )}
              <Button variant="ghost" size="sm" icon="plus" className="mt-1 w-full" onClick={() => setScheduleOpen(true)}>
                Schedule a session
              </Button>
            </div>
          </Card>

          {/* Direct messages */}
          <MessagesCard advisorId={advisorId} clientId={clientId} clientName={client.name} conversation={conversation} />

          {/* Coaching notes */}
          <NotesCard advisorId={advisorId} clientId={clientId} notes={notes} />

          <Card>
            <div className="flex items-center gap-3 p-5">
              <Avatar name={client.name} size={44} />
              <div className="text-sm">
                <p className="font-medium text-ink-800">Client since {fmtDate(client.createdAt)}</p>
                <p className="text-xs text-muted">
                  {client.lastContactAt ? `Last contact ${relative(client.lastContactAt)}` : "No contact logged yet"}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <ScheduleModal open={scheduleOpen} advisorId={advisorId} clientId={clientId} onClose={() => setScheduleOpen(false)} />
      <AddCompanyModal open={companyOpen} clientId={clientId} onClose={() => setCompanyOpen(false)} />
      <ReminderModal open={remindOpen} advisorId={advisorId} clientId={clientId} onClose={() => setRemindOpen(false)} />
      <ManageClientModal open={manageOpen} client={client} onClose={() => setManageOpen(false)} onArchived={() => navigate("/advisor/clients")} />
    </div>
  );
}

const STATUS_ORDER: ReadinessStatus[] = ["not_ready", "coaching", "employer_ready"];

function ApprovalBar({ client, readiness }: { client: User; readiness?: number }) {
  const toast = useToast();
  const current = client.readinessStatus;
  const aiSuggestion: ReadinessStatus =
    typeof readiness !== "number" ? "not_ready" : readiness >= 80 ? "employer_ready" : readiness >= 60 ? "coaching" : "not_ready";

  function set(status: ReadinessStatus) {
    Users.update(client.id, { readinessStatus: status });
    toast(`Marked ${READINESS_META[status].label.toLowerCase()}`);
  }

  return (
    <Card className="mb-6">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Readiness approval</p>
          <p className="mt-1 text-sm text-ink-700">
            Final call is yours.{" "}
            {typeof readiness === "number"
              ? <>AI suggests <span className="font-semibold text-ink-900">{READINESS_META[aiSuggestion].label}</span> ({readiness}/100).</>
              : "No interview yet — complete one for an AI suggestion."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_ORDER.map((s) => {
            const m = READINESS_META[s];
            const active = current === s;
            return (
              <button
                key={s}
                onClick={() => set(s)}
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition ${
                  active ? "border-transparent text-white" : "border-line-strong bg-surface text-ink-700 hover:bg-paper-2"
                }`}
                style={active ? { background: m.color } : undefined}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: active ? "#fff" : m.color }} />
                {m.label}
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

function SummaryBlock({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{label}</p>
      <p className="text-sm leading-relaxed text-ink-800">{body}</p>
    </div>
  );
}

function SummaryListBlock({ label, tone, icon, items }: { label: string; tone: "sage" | "gold" | "steel"; icon: "check" | "alert" | "target"; items: string[] }) {
  const color = tone === "sage" ? "text-sage-600" : tone === "gold" ? "text-gold-600" : "text-steel-600";
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{label}</p>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-sm text-ink-800">
            <Icon name={icon} size={14} className={`mt-0.5 shrink-0 ${color}`} strokeWidth={2} />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DimScore({ label, value }: { label: string; value: number }) {
  const tone = value >= 75 ? "sage" : value >= 55 ? "gold" : "clay";
  return (
    <div className="rounded-xl border border-line p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{label}</p>
        <p className="text-lg font-bold tnum text-ink-900">{value}</p>
      </div>
      <div className="mt-2"><Meter value={value} tone={tone} /></div>
    </div>
  );
}

function TrendStrip({ interviews }: { interviews: ReturnType<typeof Interviews.forClient> }) {
  const history = [...interviews].reverse(); // oldest → newest
  if (history.length < 1) return null;
  const max = 100;
  return (
    <div className="mt-5 border-t border-line pt-4">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">Improvement trend · {history.length} interview{history.length > 1 ? "s" : ""}</p>
      <div className="flex items-end gap-2">
        {history.map((iv) => {
          const sc = iv.analysis!.readinessScore;
          const tone = sc >= 80 ? "bg-sage-500" : sc >= 60 ? "bg-gold-500" : "bg-clay-500";
          return (
            <div key={iv.id} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="text-[11px] font-semibold tnum text-ink-700">{sc}</span>
              <div className="flex h-24 w-full items-end rounded-md bg-paper-2">
                <div className={`w-full rounded-md ${tone} transition-all`} style={{ height: `${(sc / max) * 100}%` }} />
              </div>
              <span className="text-[10px] text-muted">{fmtDate(iv.completedAt ?? iv.startedAt).replace(/,.*/, "")}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NotesCard({ advisorId, clientId, notes }: { advisorId: string; clientId: string; notes: ReturnType<typeof Notes.forClient> }) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [kind, setKind] = useState<NoteKind>("coaching");
  const [shared, setShared] = useState(false);

  function add() {
    const t = text.trim();
    if (!t) return;
    Notes.add({ id: uid("note"), advisorId, clientId, text: t, at: Date.now(), kind, shared });
    Users.touchContact(clientId);
    setText("");
    setShared(false);
    toast(shared ? "Feedback shared with client" : "Note saved · contact logged");
  }

  const KIND_LABEL: Record<NoteKind, string> = { coaching: "Coaching", resume: "Resume", interview: "Interview", career: "Career advice" };

  return (
    <Card>
      <CardHeader title="Coaching notes & feedback" icon="edit" />
      <div className="p-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="Log a touchpoint, or write feedback to share with the client…"
          className="scroll-thin w-full resize-none rounded-xl border border-line-strong px-3 py-2 text-sm outline-none transition placeholder:text-muted/70 focus:border-steel-400 focus:ring-2 focus:ring-steel-100"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Select value={kind} onChange={(e) => setKind(e.target.value as NoteKind)} className="!w-auto !py-1.5 text-xs">
            {(["coaching", "resume", "interview", "career"] as NoteKind[]).map((k) => (
              <option key={k} value={k}>{KIND_LABEL[k]}</option>
            ))}
          </Select>
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-ink-700">
            <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} className="h-4 w-4 rounded border-line-strong text-steel-500 focus:ring-steel-200" />
            Share with client
          </label>
          <Button size="sm" className="ml-auto" onClick={add} disabled={!text.trim()}>Log</Button>
        </div>
        <div className="mt-4 space-y-3">
          {notes.length === 0 ? (
            <p className="py-2 text-center text-xs text-muted">No notes yet. Logging a note marks the client as contacted.</p>
          ) : (
            notes.map((n) => (
              <div key={n.id} className="flex gap-2.5">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.shared ? "bg-sage-500" : "bg-steel-400"}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink-800">{n.text}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span className="rounded-full bg-paper-2 px-2 py-0.5 font-medium text-ink-600">{KIND_LABEL[n.kind ?? "coaching"]}</span>
                    {n.shared && <Pill tone="sage">Shared</Pill>}
                    {relative(n.at)}
                    <button onClick={() => Notes.remove(n.id)} className="hover:text-clay-500">Delete</button>
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  );
}

function MessagesCard({
  advisorId,
  clientId,
  clientName,
  conversation,
}: {
  advisorId: string;
  clientId: string;
  clientName: string;
  conversation: ReturnType<typeof Messages.forConversation>;
}) {
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [conversation]);

  function send() {
    const t = text.trim();
    if (!t) return;
    Messages.add({ id: uid("msg"), advisorId, clientId, from: "advisor", text: t, at: Date.now() });
    Users.touchContact(clientId);
    setText("");
  }

  return (
    <Card>
      <CardHeader title="Messages" icon="send" />
      <div
        ref={scrollRef}
        className="scroll-thin max-h-48 space-y-3 overflow-y-auto p-4"
      >
        {conversation.length === 0 ? (
          <p className="py-2 text-center text-xs text-muted">No messages yet.</p>
        ) : (
          conversation.map((m) => (
            <div key={m.id} className={`flex gap-2 ${m.from === "advisor" ? "flex-row-reverse" : ""}`}>
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                  m.from === "advisor"
                    ? "rounded-tr-sm bg-steel-500 text-white"
                    : "rounded-tl-sm bg-paper-2 text-ink-800"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))
        )}
      </div>
      <div className="border-t border-line p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            rows={2}
            placeholder={`Message ${clientName}…`}
            className="scroll-thin flex-1 resize-none rounded-lg border border-line-strong px-3 py-2 text-sm outline-none transition placeholder:text-muted/70 focus:border-steel-400 focus:ring-2 focus:ring-steel-100"
          />
          <Button size="sm" icon="send" onClick={send} disabled={!text.trim()}>Send</Button>
        </div>
      </div>
    </Card>
  );
}

function ManageClientModal({ open, client, onClose, onArchived }: { open: boolean; client: User; onClose: () => void; onArchived: () => void }) {
  const toast = useToast();
  const [name, setName] = useState(client.name);
  const [targetRole, setTargetRole] = useState(client.targetRole ?? "");
  const [careerInterests, setCareerInterests] = useState(client.careerInterests ?? "");
  const [newPassword, setNewPassword] = useState<string | null>(null);

  function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    Users.update(client.id, {
      name: name.trim() || client.name,
      targetRole: targetRole.trim() || undefined,
      careerInterests: careerInterests.trim() || undefined,
    });
    toast("Client details updated");
    onClose();
  }

  function resetPassword() {
    const pwd = `bx-${Math.random().toString(36).slice(2, 7)}`;
    Users.update(client.id, { password: pwd });
    setNewPassword(pwd);
    toast("Password reset");
  }

  function archive() {
    Users.update(client.id, { archived: true });
    toast(`${client.name} archived`, "info");
    onClose();
    onArchived();
  }

  return (
    <Modal open={open} onClose={onClose} title="Manage client">
      <form onSubmit={saveDetails} className="space-y-4">
        <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Target role" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="e.g. Frontend Engineer" />
        <Input label="Career interests" value={careerInterests} onChange={(e) => setCareerInterests(e.target.value)} placeholder="e.g. Fintech, remote, startups" />
        <Button type="submit" className="w-full">Save details</Button>
      </form>

      <div className="my-4 border-t border-line" />

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-ink-800">Login password</p>
            <p className="text-xs text-muted">Generate a new one to re-share with the client.</p>
          </div>
          <Button type="button" variant="outline" icon="refresh" onClick={resetPassword}>Reset</Button>
        </div>
        {newPassword && (
          <div className="flex items-center justify-between rounded-xl bg-paper-2 px-4 py-3 text-sm">
            <span className="text-muted">New password</span>
            <code className="font-semibold text-ink-900">{newPassword}</code>
          </div>
        )}
      </div>

      <div className="my-4 border-t border-line" />

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink-800">Archive client</p>
          <p className="text-xs text-muted">Removes them from your active roster. Data is kept.</p>
        </div>
        <Button type="button" variant="danger" icon="trash" onClick={archive}>Archive</Button>
      </div>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{label}</span>
      <span className="text-ink-800">{value || "—"}</span>
    </div>
  );
}

function InsightList({
  title,
  tone,
  icon,
  items,
}: {
  title: string;
  tone: "sage" | "gold";
  icon: "check" | "alert";
  items: string[];
}) {
  const color = tone === "sage" ? "text-sage-600" : "text-gold-600";
  return (
    <div>
      <p className={`mb-2.5 text-[13px] font-semibold ${color}`}>{title}</p>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2.5 text-sm text-ink-800">
            <Icon name={icon} size={14} className={`mt-0.5 shrink-0 ${color}`} strokeWidth={2} />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CompanyCard({ company }: { company: TargetCompany }) {
  const [busy, setBusy] = useState(false);
  const s = company.aiSummary;

  async function regenerate() {
    setBusy(true);
    await aiDelay();
    Companies.upsert({ ...company, aiSummary: summarizeCompany(company.jobDescription, company.roleTitle, company.company) });
    setBusy(false);
  }

  return (
    <div className="rounded-lg border border-line p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-ink-900">{company.company}</p>
          <p className="text-xs text-muted">{company.roleTitle} · added {fmtDate(company.createdAt)}</p>
        </div>
        <button onClick={() => Companies.remove(company.id)} className="text-xs text-muted transition hover:text-clay-500">
          Remove
        </button>
      </div>

      {s ? (
        <div className="mt-3.5 space-y-3.5">
          <div className="rounded-lg bg-steel-50 p-3">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-steel-700">
              <AiBadge /> Criteria breakdown
            </p>
            <p className="mt-2 text-xs leading-relaxed text-ink-700">{s.fitNote}</p>
          </div>
          <Grid title="Must-haves" items={s.mustHaves} />
          {s.niceToHaves.length > 0 && <Grid title="Nice-to-haves" items={s.niceToHaves} />}
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">Keywords for the resume</p>
            <div className="flex flex-wrap gap-1.5">
              {s.keywords.map((k) => (
                <span key={k} className="rounded-md bg-paper-2 px-2 py-0.5 text-xs font-medium text-ink-700">{k}</span>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-line p-3">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">Resume tips</p>
            <ul className="space-y-1.5">
              {s.resumeTips.map((t, i) => (
                <li key={i} className="flex gap-2 text-xs text-ink-800">
                  <Icon name="chevronRight" size={13} className="mt-0.5 shrink-0 text-steel-500" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <Button size="sm" variant="ghost" icon="refresh" onClick={regenerate} disabled={busy}>
            {busy ? "Re-summarizing…" : "Re-run AI summary"}
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="accent" icon="sparkle" className="mt-3.5" onClick={regenerate} disabled={busy}>
          {busy ? "Summarizing…" : "Summarize criteria with AI"}
        </Button>
      )}

      <details className="group mt-3">
        <summary className="flex cursor-pointer items-center gap-1.5 text-xs text-muted">
          <Icon name="chevronRight" size={12} className="transition-transform group-open:rotate-90" />
          View raw job description
        </summary>
        <p className="mt-1.5 whitespace-pre-wrap rounded-lg bg-paper-2 p-2.5 text-xs leading-relaxed text-ink-600">{company.jobDescription}</p>
      </details>
    </div>
  );
}

function Grid({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{title}</p>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-xs text-ink-800">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted" />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReminderModal({ open, advisorId, clientId, onClose }: { open: boolean; advisorId: string; clientId: string; onClose: () => void }) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [days, setDays] = useState(1);
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    Reminders.upsert({
      id: uid("rem"),
      advisorId,
      clientId,
      text: text.trim(),
      dueAt: Date.now() + days * 24 * 60 * 60 * 1000,
      done: false,
      source: "manual",
    });
    setText("");
    setDays(1);
    toast("Reminder added");
    onClose();
  }
  return (
    <Modal open={open} onClose={onClose} title="Add a follow-up reminder">
      <form onSubmit={submit} className="space-y-4">
        <Textarea label="Reminder" value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="e.g. Send tailored resume draft" />
        <Select label="Due in" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          {[1, 2, 3, 7].map((d) => (
            <option key={d} value={d}>{d} day{d > 1 ? "s" : ""}</option>
          ))}
        </Select>
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1">Add reminder</Button>
        </div>
      </form>
    </Modal>
  );
}

function ScheduleModal({ open, advisorId, clientId, onClose }: { open: boolean; advisorId: string; clientId: string; onClose: () => void }) {
  const toast = useToast();
  const defaultWhen = new Date(Date.now() + 24 * 3600 * 1000);
  defaultWhen.setMinutes(0, 0, 0);
  const [topic, setTopic] = useState("Mock interview review");
  const [when, setWhen] = useState(toLocalInput(defaultWhen));
  const [duration, setDuration] = useState(30);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    Sessions.upsert({
      id: uid("ses"),
      advisorId,
      clientId,
      when: new Date(when).getTime(),
      durationMins: duration,
      topic: topic.trim() || "Coaching session",
      status: "scheduled",
    });
    Users.touchContact(clientId);
    toast("Session scheduled");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Schedule a session">
      <form onSubmit={submit} className="space-y-4">
        <Input label="Topic" value={topic} onChange={(e) => setTopic(e.target.value)} />
        <Input label="Date & time" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        <Select label="Duration" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
          {[15, 30, 45, 60].map((m) => (
            <option key={m} value={m}>{m} minutes</option>
          ))}
        </Select>
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1">Schedule</Button>
        </div>
      </form>
    </Modal>
  );
}

function AddCompanyModal({ open, clientId, onClose }: { open: boolean; clientId: string; onClose: () => void }) {
  const toast = useToast();
  const [company, setCompany] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [jd, setJd] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!company.trim() || !jd.trim()) return;
    setBusy(true);
    const target: TargetCompany = {
      id: uid("co"),
      clientId,
      company: company.trim(),
      roleTitle: roleTitle.trim() || "Target role",
      jobDescription: jd.trim(),
      createdAt: Date.now(),
    };
    await aiDelay();
    target.aiSummary = summarizeCompany(target.jobDescription, target.roleTitle, target.company);
    Companies.upsert(target);
    setBusy(false);
    setCompany(""); setRoleTitle(""); setJd("");
    toast("Target added · criteria summarized");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add target company" width="max-w-lg">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Monzo" required />
          <Input label="Role title" value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} placeholder="Frontend Engineer" />
        </div>
        <Textarea
          label="Job description / requirements"
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          rows={7}
          placeholder="Paste the company's requirements or criteria. AI will break them into must-haves, keywords, and resume tips."
          required
        />
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="accent" icon="sparkle" className="flex-1" disabled={busy}>
            {busy ? "Summarizing…" : "Add & summarize"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
