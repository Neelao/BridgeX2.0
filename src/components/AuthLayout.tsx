import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo, Icon } from "./ui";

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  accent = "advisor",
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  accent?: "advisor" | "client";
}) {
  const points =
    accent === "advisor"
      ? [
          "AI readiness summaries for every client interview",
          "Job-criteria breakdowns that drive resume tailoring",
          "Morning briefings and proactive follow-ups",
        ]
      : [
          "Practice with an AI interviewer, anytime",
          "Instant, structured feedback on every answer",
          "A clear readiness score that climbs as you improve",
        ];

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between bg-ink-900 p-12 text-white lg:flex">
        <Link to="/">
          <Logo onDark />
        </Link>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
            {accent === "advisor" ? "For career advisors" : "For job seekers"}
          </p>
          <h2 className="mt-4 max-w-md text-[30px] font-semibold leading-tight tracking-tight">
            {accent === "advisor"
              ? "One workspace to make every client interview-ready."
              : "Practice, get feedback, and land the role."}
          </h2>
          <ul className="mt-7 space-y-3">
            {points.map((p) => (
              <li key={p} className="flex items-start gap-3 text-sm text-white/70">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-steel-300">
                  <Icon name="check" size={13} strokeWidth={2} />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-white/35">Front-end demo · data stored locally in your browser</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-paper px-6 py-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 inline-block lg:hidden">
            <Logo />
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">{title}</h1>
          <p className="mt-1.5 text-sm text-muted">{subtitle}</p>
          <div className="mt-7">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 rounded-lg bg-clay-50 px-3.5 py-2.5 text-sm font-medium text-clay-600">
      <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
      {message}
    </div>
  );
}
