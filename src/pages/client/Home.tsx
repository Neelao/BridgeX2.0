import { Link } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { useStore } from "../../lib/useStore";
import { Companies, Interviews, Notes, Opportunities, Profiles, Referrals, Sessions, Users } from "../../lib/db";
import { fmtDate, fmtDateTime, relative } from "../../lib/format";
import { PageHeader } from "../../components/Shell";
import { Button, Card, CardHeader, Icon, Pill, ReadinessTag, ReferralTag, ScoreRing } from "../../components/ui";

export default function ClientHome() {
  const { user } = useAuth();
  const clientId = user!.id;

  const profile = useStore(() => Profiles.forClient(clientId), [clientId]);
  const latest = useStore(() => Interviews.latestComplete(clientId), [clientId]);
  const sessions = useStore(
    () => Sessions.forClient(clientId).filter((s) => s.status === "scheduled" && s.when > Date.now()),
    [clientId]
  );
  const companies = useStore(() => Companies.forClient(clientId), [clientId]);
  const feedback = useStore(() => Notes.forClient(clientId).filter((n) => n.shared), [clientId]);
  const referrals = useStore(() => Referrals.forClient(clientId), [clientId]);
  const advisor = user!.advisorId ? Users.byId(user!.advisorId) : undefined;
  const status = user!.readinessStatus;

  const hasCv = !!profile?.cvText?.trim();
  const score = latest?.analysis?.readinessScore;

  const steps = [
    { done: hasCv, label: "Complete your profile and add your CV", to: "/client/profile" },
    { done: !!latest, label: "Finish an AI mock interview", to: "/client/interview" },
    { done: !!score && score >= 70, label: "Reach an interview-ready score (70+)", to: "/client/results" },
  ];
  const completed = steps.filter((s) => s.done).length;

  return (
    <div>
      <PageHeader
        eyebrow={advisor ? `Advised by ${advisor.name}${advisor.agency ? ` · ${advisor.agency}` : ""}` : "Your workspace"}
        title={
          <span className="flex flex-wrap items-center gap-3">
            Hi {user!.name.split(" ")[0]}.
            {status && <ReadinessTag status={status} />}
          </span>
        }
        subtitle="Practice, track your readiness, and prepare for the roles you want."
      />

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <div className="flex flex-col items-center gap-6 p-6 sm:flex-row">
            {typeof score === "number" ? (
              <ScoreRing score={score} size={108} strokeWidth={7} />
            ) : (
              <span className="flex h-[108px] w-[108px] shrink-0 items-center justify-center rounded-full bg-paper-2 text-muted">
                <Icon name="mic" size={36} strokeWidth={1.4} />
              </span>
            )}
            <div className="flex-1 text-center sm:text-left">
              {typeof score === "number" ? (
                <>
                  <h2 className="text-lg font-semibold text-ink-900">
                    You're {score >= 80 ? "interview-ready" : score >= 60 ? "almost there" : "building momentum"}.
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{latest!.analysis!.summary}</p>
                  <Link to="/client/results">
                    <Button size="sm" icon="arrowRight" className="mt-4">View full results</Button>
                  </Link>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold text-ink-900">Run your first mock interview</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    Practice with our AI interviewer. You'll get an instant readiness score, and your advisor gets a coaching plan.
                  </p>
                  <Link to="/client/interview">
                    <Button size="sm" icon="arrowRight" className="mt-4">Start mock interview</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Your progress" />
          <div className="px-5 pt-3 text-xs text-muted">{completed} of {steps.length} done</div>
          <div className="space-y-1 p-2.5">
            {steps.map((s) => (
              <Link key={s.label} to={s.to} className="flex items-start gap-2.5 rounded-lg px-2.5 py-2 hover:bg-paper-2">
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                    s.done ? "bg-sage-500 text-white" : "border border-line-strong text-transparent"
                  }`}
                >
                  <Icon name="check" size={12} strokeWidth={2.4} />
                </span>
                <span className={`text-sm ${s.done ? "text-muted line-through" : "text-ink-800"}`}>{s.label}</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title="Upcoming sessions" icon="calendar" />
          <div className="p-5">
            {sessions.length === 0 ? (
              <p className="py-3 text-center text-sm text-muted">No sessions scheduled with your advisor yet.</p>
            ) : (
              <div className="space-y-3.5">
                {sessions.map((s) => (
                  <div key={s.id} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-steel-50 text-steel-600">
                      <Icon name="calendar" size={16} />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-ink-800">{s.topic}</p>
                      <p className="text-xs text-muted">{fmtDateTime(s.when)} · {relative(s.when)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Roles you're targeting" icon="briefcase" />
          <div className="p-5">
            {companies.length === 0 ? (
              <p className="py-3 text-center text-sm text-muted">Your advisor will add target roles and tailor your prep.</p>
            ) : (
              <div className="space-y-2">
                {companies.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg bg-paper-2 px-3.5 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-ink-800">{c.roleTitle}</p>
                      <p className="text-xs text-muted">{c.company}</p>
                    </div>
                    {c.aiSummary && <Pill tone="steel">{c.aiSummary.keywords.length} keywords</Pill>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Advisor feedback + referrals */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title="Feedback from your advisor" icon="edit" />
          <div className="p-5">
            {feedback.length === 0 ? (
              <p className="py-3 text-center text-sm text-muted">No feedback shared yet — it'll appear here after coaching.</p>
            ) : (
              <div className="space-y-3.5">
                {feedback.map((n) => (
                  <div key={n.id} className="rounded-xl bg-paper-2 p-3.5">
                    <p className="text-sm text-ink-800">{n.text}</p>
                    <p className="mt-1 text-xs text-muted">{advisor?.name ?? "Advisor"} · {relative(n.at)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Your referrals" icon="briefcase" />
          <div className="p-5">
            {referrals.length === 0 ? (
              <p className="py-3 text-center text-sm text-muted">When your advisor refers you to an employer, you'll see it here.</p>
            ) : (
              <div className="space-y-2.5">
                {referrals.map((r) => {
                  const opp = Opportunities.byId(r.opportunityId);
                  return (
                    <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl bg-paper-2 px-3.5 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink-800">{opp ? opp.role : "Opportunity"}</p>
                        <p className="truncate text-xs text-muted">{opp ? `${opp.org} · ${fmtDate(r.at)}` : fmtDate(r.at)}</p>
                      </div>
                      <ReferralTag status={r.status} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
