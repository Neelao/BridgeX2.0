import { Link } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { useStore } from "../../lib/useStore";
import { Interviews } from "../../lib/db";
import { fmtDateTime } from "../../lib/format";
import { PageHeader } from "../../components/Shell";
import { AiBadge, Button, Card, CardHeader, EmptyState, Icon, ScoreRing } from "../../components/ui";

export default function Results() {
  const { user } = useAuth();
  const clientId = user!.id;
  const interviews = useStore(
    () => Interviews.forClient(clientId).filter((i) => i.completedAt && i.analysis),
    [clientId]
  );

  const latest = interviews[0];

  if (!latest) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader eyebrow="Performance" title="My results" />
        <EmptyState
          title="No results yet"
          body="Complete an AI mock interview to see your readiness score and personalised feedback."
          action={<Link to="/client/interview"><Button>Start a mock interview</Button></Link>}
        />
      </div>
    );
  }

  const a = latest.analysis!;
  const prev = interviews[1]?.analysis?.readinessScore;
  const delta = typeof prev === "number" ? a.readinessScore - prev : null;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow={`Latest mock interview · ${fmtDateTime(latest.completedAt!)}`}
        title="My results"
        action={<Link to="/client/interview"><Button variant="outline" icon="refresh">Retake</Button></Link>}
      />

      <Card>
        <div className="flex flex-col items-center gap-6 p-6 sm:flex-row">
          <ScoreRing score={a.readinessScore} size={112} strokeWidth={7} />
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <h2 className="text-xl font-semibold text-ink-900 tnum">{a.readinessScore}/100 readiness</h2>
              {delta !== null && delta !== 0 && (
                <span className={`text-sm font-semibold ${delta > 0 ? "text-sage-600" : "text-clay-500"}`}>
                  {delta > 0 ? "↑" : "↓"} {Math.abs(delta)}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{a.summary}</p>
          </div>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader title="What you did well" icon="check" />
          <ul className="space-y-2.5 p-5">
            {a.strengths.map((s, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-ink-800">
                <Icon name="check" size={15} className="mt-0.5 shrink-0 text-sage-600" strokeWidth={2} />
                {s}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="What to work on" icon="target" />
          <ul className="space-y-2.5 p-5">
            {a.gaps.map((s, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-ink-800">
                <Icon name="alert" size={15} className="mt-0.5 shrink-0 text-gold-600" strokeWidth={2} />
                {s}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Resume tips" icon="file" action={<AiBadge />} />
        <ul className="space-y-2.5 p-5">
          {a.resumeSuggestions.map((s, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-ink-800">
              <Icon name="chevronRight" size={14} className="mt-0.5 shrink-0 text-steel-500" />
              {s}
            </li>
          ))}
        </ul>
        <div className="border-t border-line px-5 py-3 text-xs text-muted">
          Your advisor sees this too, along with a coaching plan to help you close the gaps.
        </div>
      </Card>

      {interviews.length > 1 && (
        <Card className="mt-6">
          <CardHeader title="Your history" icon="chart" />
          <div className="divide-y divide-line">
            {interviews.map((iv) => (
              <div key={iv.id} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-muted">{fmtDateTime(iv.completedAt!)}</span>
                <span className="text-sm font-semibold tnum text-ink-800">{iv.analysis!.readinessScore}/100</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
