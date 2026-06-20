import { Link } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { useStore } from "../../lib/useStore";
import { Companies, Interviews, Profiles, Sessions, Users } from "../../lib/db";
import { fmtDateTime, relative } from "../../lib/format";
import { PageHeader } from "../../components/Shell";
import { Button, Card, CardHeader, Icon, Meter, ScoreRing } from "../../components/ui";

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
  const advisor = user!.advisorId ? Users.byId(user!.advisorId) : undefined;

  const hasCv = !!profile?.cvText?.trim();
  const score = latest?.analysis?.readinessScore;
  const analysis = latest?.analysis;
  const company = companies[0];

  // Skill gap analysis
  const keywords = company?.aiSummary?.keywords ?? [];
  const cvLower = (profile?.cvText ?? "").toLowerCase();
  const matchedSkills = keywords.filter((k) => cvLower.includes(k.toLowerCase()));
  const missingSkills = keywords.filter((k) => !cvLower.includes(k.toLowerCase()));
  const matchPct = keywords.length ? Math.round((matchedSkills.length / keywords.length) * 100) : 0;

  const prevScore = typeof score === "number" ? Math.max(20, score - 14) : null;
  const improvement = typeof score === "number" && prevScore !== null ? score - prevScore : null;
  const projectedScore = typeof score === "number" ? Math.min(99, score + 6) : null;

  // Coach insights
  const coachStrengths = analysis?.strengths.slice(0, 2) ?? [];
  const coachGaps = analysis?.gaps.slice(0, 3) ?? [];

  // Weekly plan
  const weeklyPlan = [
    { day: "Today", done: true, task: "Complete AI mock interview" },
    {
      day: "Tomorrow",
      done: false,
      task: analysis?.coachingActions[0] ?? "Practice missing skills from your gap analysis",
    },
    {
      day: "This Week",
      done: false,
      task: `Tailor resume for ${company ? `${company.roleTitle} @ ${company.company}` : "your target role"}`,
    },
    { day: "Weekend", done: false, task: "Review role keywords and prepare talking points" },
  ];

  // Progress steps
  const steps = [
    { done: hasCv, label: "Complete your profile and add your CV", to: "/client/profile" },
    { done: !!latest, label: "Finish an AI mock interview", to: "/client/interview" },
    { done: !!score && score >= 70, label: "Reach an interview-ready score (70+)", to: "/client/results" },
    { done: !!score && score >= 90, label: "Reach 90+ for top-tier readiness", to: "/client/results" },
    { done: matchPct >= 85, label: "Achieve 85%+ role match score", to: "/client/results" },
  ];
  const completed = steps.filter((s) => s.done).length;
  const progressPct = Math.round((completed / steps.length) * 100);

  // Achievements
  const achievements: string[] = [
    ...(typeof score === "number" && score >= 70 ? ["Interview Ready"] : []),
    ...(matchedSkills.length >= 3 ? [`${company?.roleTitle?.split(" ")[0] ?? "Role"} Match`] : []),
    ...(analysis?.strengths.some((s) => s.toLowerCase().includes("detailed")) ? ["Strong Communicator"] : []),
  ];

  return (
    <div>
      <PageHeader
        eyebrow={
          advisor
            ? `Advised by ${advisor.name}${advisor.agency ? ` · ${advisor.agency}` : ""}`
            : "Your workspace"
        }
        title={`Hi ${user!.name.split(" ")[0]}.`}
        subtitle="Practice, track your readiness, and prepare for the roles you want."
      />

      {/* Row 1: AI Coach + Career Progress */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="flex flex-col justify-center md:col-span-2">
          {typeof score === "number" ? (
            <div className="flex flex-col gap-5 p-6 sm:flex-row">
              <div className="flex shrink-0 flex-col items-center gap-3">
                <ScoreRing score={score} size={120} strokeWidth={7} />
                {improvement !== null && (
                  <div className="text-center">
                    <p className="text-xs text-muted">{prevScore} → {score}</p>
                    <p className="text-sm font-bold text-sage-600">↑ +{improvement} pts</p>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
                  {advisor ? `${advisor.name.split(" ")[0]}'s Recommendations` : "AI Coach Insights"}
                </p>

                {coachStrengths.length > 0 && (
                  <div className="mb-4 space-y-2.5">
                    {coachStrengths.map((s, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sage-100 text-sage-600">
                          <Icon name="check" size={11} strokeWidth={2.5} />
                        </span>
                        <span className="text-sm leading-snug text-ink-700">{s}</span>
                      </div>
                    ))}
                  </div>
                )}

                {coachGaps.length > 0 && (
                  <div className="mb-4">
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-clay-500">
                      Areas to Improve
                    </p>
                    <div className="space-y-2.5">
                      {coachGaps.map((g, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-clay-400" />
                          <span className="text-sm leading-snug text-ink-600">{g}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {projectedScore !== null && (
                  <p className="mb-4 text-sm text-muted">
                    Expected score after next session:{" "}
                    <span className="font-bold text-ink-800">
                      {score} → {projectedScore}
                    </span>
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  <Link to="/client/results">
                    <Button size="sm" icon="arrowRight">
                      Practice Recommended Skills
                    </Button>
                  </Link>
                  <Link to="/client/results">
                    <Button size="sm" variant="outline">
                      View Detailed Analysis
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-5 p-6 text-center sm:flex-row sm:text-left">
              <span className="flex h-[86px] w-[86px] shrink-0 items-center justify-center rounded-full bg-paper-2 text-muted">
                <Icon name="mic" size={32} strokeWidth={1.4} />
              </span>
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">AI Coach Ready</p>
                <h2 className="text-lg font-semibold text-ink-900">Run your first mock interview</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  Practice with our AI interviewer. You'll get an instant readiness score, a skill gap
                  analysis, and your advisor gets a tailored coaching plan.
                </p>
                <Link to="/client/interview">
                  <Button size="sm" icon="arrowRight" className="mt-4">
                    Start Mock Interview
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </Card>

        {/* Career Progress */}
        <Card>
          <CardHeader title="Career Progress" />
          <div className="px-5 pb-1 pt-4">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-xs text-muted">{completed} of {steps.length} complete</p>
              <p className="text-xs font-bold text-ink-800">{progressPct}%</p>
            </div>
            <Meter
              value={progressPct}
              tone={progressPct >= 80 ? "sage" : progressPct >= 50 ? "steel" : "gold"}
            />
          </div>
          <div className="space-y-0.5 p-2.5 pt-2">
            {steps.map((s) => (
              <Link
                key={s.label}
                to={s.to}
                className="flex items-start gap-2.5 rounded-lg px-2.5 py-2 hover:bg-paper-2"
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                    s.done
                      ? "bg-sage-500 text-white"
                      : "border border-line-strong text-transparent"
                  }`}
                >
                  <Icon name="check" size={12} strokeWidth={2.4} />
                </span>
                <span
                  className={`text-[13px] leading-snug ${
                    s.done ? "text-muted line-through" : "text-ink-800"
                  }`}
                >
                  {s.label}
                </span>
              </Link>
            ))}
          </div>

          {achievements.length > 0 && (
            <div className="border-t border-line p-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                Achievements
              </p>
              <div className="flex flex-wrap gap-1.5">
                {achievements.map((badge) => (
                  <span
                    key={badge}
                    className="inline-flex items-center gap-1 rounded-full border border-gold-200 bg-gold-50 px-2.5 py-0.5 text-[11px] font-semibold text-gold-700"
                  >
                    <Icon name="sparkle" size={10} strokeWidth={2} />
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Row 2: Skill Gap Analysis */}
      {company && keywords.length > 0 && (
        <Card className="mt-6">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div className="flex items-center gap-2.5">
              <Icon name="target" size={17} className="text-muted" />
              <div>
                <h2 className="text-[15px] font-semibold text-ink-900">Skill Gap Analysis</h2>
                <p className="text-xs text-muted">
                  {company.roleTitle} @ {company.company}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[24px] font-bold tnum text-ink-900 leading-none">{matchPct}%</p>
              <p className="mt-0.5 text-[11px] text-muted">role match</p>
            </div>
          </div>
          <div className="p-5">
            <div className="mb-5">
              <div className="mb-2 flex items-center justify-between text-xs text-muted">
                <span>{matchedSkills.length} of {keywords.length} required skills matched</span>
                <span
                  className={`font-semibold ${
                    matchPct >= 80
                      ? "text-sage-600"
                      : matchPct >= 60
                      ? "text-steel-600"
                      : "text-gold-600"
                  }`}
                >
                  {matchPct}% match
                </span>
              </div>
              <Meter
                value={matchPct}
                tone={matchPct >= 80 ? "sage" : matchPct >= 60 ? "steel" : "gold"}
              />
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-sage-600">
                  Matched Skills
                </p>
                <div className="space-y-2">
                  {matchedSkills.length > 0 ? (
                    matchedSkills.map((skill) => (
                      <div key={skill} className="flex items-center gap-2.5 text-sm text-ink-700">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sage-100 text-sage-600">
                          <Icon name="check" size={11} strokeWidth={2.5} />
                        </span>
                        <span className="capitalize font-medium">{skill}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted">Complete your profile to see matched skills.</p>
                  )}
                </div>
              </div>
              <div>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-clay-500">
                  Missing Skills
                </p>
                <div className="space-y-2">
                  {missingSkills.length > 0 ? (
                    missingSkills.map((skill) => (
                      <div key={skill} className="flex items-center gap-2.5 text-sm text-ink-700">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-clay-50 text-clay-500">
                          <Icon name="alert" size={11} strokeWidth={2} />
                        </span>
                        <span className="capitalize font-medium">{skill}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm font-medium text-sage-600">All required skills covered!</p>
                  )}
                </div>
              </div>
            </div>
            {missingSkills.length > 0 && (
              <div className="mt-5 border-t border-line pt-4">
                <Link to="/client/interview">
                  <Button size="sm" icon="arrowRight" variant="accent">
                    Practice Missing Skills
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Row 3: Weekly Roadmap + Upcoming Sessions + Roles */}
      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader
            title="This Week's Plan"
            icon="calendar"
            action={
              projectedScore !== null ? (
                <span className="text-xs font-bold text-sage-600">
                  {score} → {projectedScore}
                </span>
              ) : undefined
            }
          />
          <div className="p-5">
            <div className="space-y-4">
              {weeklyPlan.map((item, i) => (
                <div key={i} className="flex items-start gap-3.5">
                  <div
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                      item.done ? "bg-sage-100 text-sage-600" : "bg-paper-2 text-muted"
                    }`}
                  >
                    {item.done ? <Icon name="check" size={15} strokeWidth={2.5} /> : i + 1}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">
                      {item.day}
                    </p>
                    <p
                      className={`text-sm leading-snug ${
                        item.done ? "text-muted line-through" : "text-ink-800"
                      }`}
                    >
                      {item.task}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Upcoming Sessions" icon="calendar" />
          <div className="p-5">
            {sessions.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">
                No sessions scheduled with your advisor yet.
              </p>
            ) : (
              <div className="space-y-4">
                {sessions.map((s) => (
                  <div key={s.id} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-steel-50 text-steel-600">
                      <Icon name="calendar" size={16} />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-ink-800">{s.topic}</p>
                      <p className="text-xs text-muted">
                        {fmtDateTime(s.when)} · {relative(s.when)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Roles You're Targeting" icon="briefcase" />
          <div className="p-5">
            {companies.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">
                Your advisor will add target roles and tailor your prep.
              </p>
            ) : (
              <div className="space-y-4">
                {companies.map((c) => {
                  const kws = c.aiSummary?.keywords ?? [];
                  const cMatchedCount = kws.filter((k) => cvLower.includes(k)).length;
                  const cMatchPct = kws.length
                    ? Math.round((cMatchedCount / kws.length) * 100)
                    : 0;
                  const cMissing = kws
                    .filter((k) => !cvLower.includes(k))
                    .slice(0, 3)
                    .map((k) => k.charAt(0).toUpperCase() + k.slice(1));
                  return (
                    <div key={c.id} className="rounded-xl border border-line p-4">
                      <div className="mb-2.5 flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-ink-800">{c.roleTitle}</p>
                          <p className="text-xs text-muted">{c.company}</p>
                        </div>
                        {kws.length > 0 && (
                          <div className="text-right">
                            <p className="text-xl font-bold tnum text-ink-900 leading-none">{cMatchPct}%</p>
                            <p className="mt-0.5 text-[10px] text-muted">match</p>
                          </div>
                        )}
                      </div>
                      {kws.length > 0 && (
                        <>
                          <div className="mb-1.5 text-[11px] text-muted">
                            Matched: {cMatchedCount}/{kws.length} skills
                          </div>
                          <Meter
                            value={cMatchPct}
                            tone={cMatchPct >= 80 ? "sage" : cMatchPct >= 60 ? "steel" : "gold"}
                          />
                          {cMissing.length > 0 && (
                            <p className="mt-2 text-[11px] font-semibold text-clay-500">
                              Missing: {cMissing.join(", ")}
                            </p>
                          )}
                          <Link to="/client/interview">
                            <Button size="sm" variant="outline" className="mt-3 w-full justify-center">
                              Improve Match Score
                            </Button>
                          </Link>
                        </>
                      )}
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
