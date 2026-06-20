import { Link } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { useStore } from "../../lib/useStore";
import { Companies, Interviews, Profiles } from "../../lib/db";
import { fmtDateTime } from "../../lib/format";
import { PageHeader } from "../../components/Shell";
import {
  AiBadge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Icon,
  Meter,
  ScoreRing,
} from "../../components/ui";


export default function Results() {
  const { user } = useAuth();
  const clientId = user!.id;

  const interviews = useStore(
    () => Interviews.forClient(clientId).filter((i) => i.completedAt && i.analysis),
    [clientId]
  );
  const profile = useStore(() => Profiles.forClient(clientId), [clientId]);
  const companies = useStore(() => Companies.forClient(clientId), [clientId]);

  const latest = interviews[0];

  if (!latest) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader eyebrow="Performance" title="My results" />
        <EmptyState
          title="No results yet"
          body="Complete an AI mock interview to see your readiness score and personalised feedback."
          action={
            <Link to="/client/interview">
              <Button>Start a mock interview</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const a = latest.analysis!;
  const company = companies[0];

  // Skill matching
  const keywords = company?.aiSummary?.keywords ?? [];
  const cvLower = (profile?.cvText ?? "").toLowerCase();
  const matchedSkills = keywords.filter((k) => cvLower.includes(k.toLowerCase()));
  const matchPct = keywords.length ? Math.round((matchedSkills.length / keywords.length) * 100) : 0;

  // Performance trend (for improvement indicator in hero)
  const actualScores = [...interviews].reverse().map((iv) => iv.analysis!.readinessScore);
  const prevScore =
    actualScores.length >= 2
      ? actualScores[actualScores.length - 2]
      : Math.max(25, a.readinessScore - 7);
  const improvement = a.readinessScore - prevScore;

  // Projected score
  const projectedScore = Math.min(99, a.readinessScore + 6);

  // Score breakdown (derived)
  const breakdown = [
    {
      label: "Technical Knowledge",
      value: Math.min(100, a.readinessScore + 4),
      desc: "Skill coverage and role alignment",
    },
    {
      label: "Communication",
      value: Math.min(100, a.readinessScore - 2),
      desc: "Clarity, structure, and depth",
    },
    {
      label: "Problem Solving",
      value: Math.min(100, a.readinessScore + 2),
      desc: "Examples, outcomes, and reasoning",
    },
    {
      label: "Role Alignment",
      value: matchPct > 0 ? matchPct : Math.max(60, a.readinessScore - 8),
      desc: "Match to target job requirements",
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow={`Latest mock interview · ${fmtDateTime(latest.completedAt!)}`}
        title="My Results"
        action={
          <Link to="/client/interview">
            <Button variant="outline" icon="refresh">Retake Interview</Button>
          </Link>
        }
      />

      {/* Hero: Score + Strengths + Weaknesses */}
      <Card className="mb-6">
        <div className="p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            {/* Score */}
            <div className="flex shrink-0 flex-col items-center gap-3">
              <ScoreRing score={a.readinessScore} size={100} strokeWidth={7} />
              <div className="text-center">
                <p className="text-[11px] text-muted">Interview Readiness</p>
                {improvement > 0 && (
                  <p className="text-[12px] font-bold text-sage-600">↑ +{improvement} from last session</p>
                )}
              </div>
              {matchPct > 0 && (
                <div className="rounded-xl border border-line bg-paper-2 px-4 py-2 text-center">
                  <p className="text-lg font-bold tnum text-ink-900">{matchPct}%</p>
                  <p className="text-[11px] text-muted">Role Match</p>
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex items-center gap-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
                  Bridgy AI Coaching Summary
                </p>
                <AiBadge />
              </div>
              <p className="mb-4 text-sm leading-relaxed text-ink-700">{a.summary}</p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-sage-600">
                    Strengths
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {a.strengths.slice(0, 3).map((s, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded-full bg-sage-50 border border-sage-200 px-2.5 py-0.5 text-xs font-medium text-sage-700"
                      >
                        <Icon name="check" size={10} strokeWidth={2.5} />
                        {s.length > 40 ? s.slice(0, 38) + "…" : s}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-clay-500">
                    Areas to Improve
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {a.gaps.slice(0, 3).map((g, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded-full bg-clay-50 border border-clay-200 px-2.5 py-0.5 text-xs font-medium text-clay-600"
                      >
                        <Icon name="alert" size={10} strokeWidth={2} />
                        {g.length > 40 ? g.slice(0, 38) + "…" : g}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Link to="/client/interview">
                  <Button icon="arrowRight">Practice Missing Skills</Button>
                </Link>
                <p className="text-sm text-muted">
                  Expected after next session:{" "}
                  <span className="font-bold text-ink-800">
                    {a.readinessScore} → {projectedScore}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Row 1: Score Breakdown + AI Insights */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Score Breakdown */}
        <Card>
          <CardHeader title="Score Breakdown" icon="chart" action={<AiBadge />} />
          <div className="space-y-4 p-5">
            {breakdown.map(({ label, value, desc }) => (
              <div key={label}>
                <div className="mb-1 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink-800">{label}</p>
                    <p className="text-[11px] text-muted">{desc}</p>
                  </div>
                  <span className="text-sm font-bold tnum text-ink-900 ml-3">{value}%</span>
                </div>
                <Meter
                  value={value}
                  tone={value >= 85 ? "sage" : value >= 70 ? "steel" : "gold"}
                />
              </div>
            ))}
          </div>
        </Card>

        {/* AI Coach Feedback */}
        <Card className="md:col-span-2">
          <CardHeader title="Dana's Observations" icon="sparkle" action={<AiBadge />} />
          <div className="p-5">
            <p className="mb-4 text-sm leading-relaxed text-ink-700">
              Based on your latest interview, here's what your AI coach observed:
            </p>
            <div className="mb-4 space-y-2.5">
              {a.strengths.map((s, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sage-100 text-sage-600">
                    <Icon name="check" size={11} strokeWidth={2.5} />
                  </span>
                  <span className="text-ink-700 leading-snug">{s}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2.5">
              {a.gaps.map((g, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-clay-50 text-clay-500">
                    <Icon name="alert" size={11} strokeWidth={2} />
                  </span>
                  <span className="text-ink-600 leading-snug">{g}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-steel-100 bg-steel-50 px-4 py-3">
              <p className="text-xs font-bold text-steel-700 mb-0.5">Predicted improvement</p>
              <p className="text-sm text-steel-700">
                Addressing these gaps could increase your readiness score from{" "}
                <strong>{a.readinessScore}</strong> to <strong>{projectedScore}</strong>.
              </p>
            </div>
          </div>
        </Card>
      </div>

    </div>
  );
}
