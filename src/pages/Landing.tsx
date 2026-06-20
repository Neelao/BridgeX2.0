import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "../lib/auth";
import { Button, Logo, Icon } from "../components/ui";
import type { IconName } from "../components/Icon";

const FEATURES: { icon: IconName; title: string; body: string }[] = [
  { icon: "mic", title: "AI mock interviews", body: "Chat-style interviews that adapt and probe for detail." },
  { icon: "chart", title: "Instant readiness scores", body: "Every interview analysed against the CV and target role." },
  { icon: "file", title: "Resume tailoring", body: "AI turns a job's criteria into concrete resume actions." },
  { icon: "bell", title: "Proactive follow-ups", body: "Morning briefings and reminders so no client slips." },
];

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate(user.role === "advisor" ? "/advisor" : "/client", { replace: true });
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-paper">
      <header className="nav-surface sticky top-0 z-30 border-b border-black/5">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6">
          <Logo />
          <div className="flex items-center gap-2">
            <Link
              to="/client/sign-in"
              className="rounded-full px-3.5 py-2 text-[13px] font-medium text-ink-700 transition hover:bg-black/5 hover:text-ink-900"
            >
              Client sign in
            </Link>
            <Link to="/advisor/sign-in">
              <Button variant="accent" size="sm">
                Advisor sign in
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 sm:px-6">
        <section className="grid items-center gap-12 py-16 lg:grid-cols-[1.1fr_1fr] lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              <Icon name="sparkle" size={12} className="text-steel-500" />
              AI-powered career coaching
            </span>
            <h1 className="mt-6 text-[44px] font-semibold leading-[1.05] tracking-tight text-ink-900 sm:text-[56px]">
              Make job seekers
              <br />
              <span className="text-steel-500">interview-ready</span>, faster.
            </h1>
            <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-ink-600">
              Candidates run AI mock interviews analysed against their CV. Advisors get instant
              readiness summaries, tailored resume tips, and proactive follow-ups — in one workspace.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/advisor/sign-in">
                <Button size="md" icon="arrowRight">
                  Enter advisor workspace
                </Button>
              </Link>
              <Link to="/client/sign-in">
                <Button size="md" variant="outline">
                  I'm a job seeker
                </Button>
              </Link>
            </div>

            <div className="mt-9 max-w-md rounded-xl border border-line bg-surface p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                Demo logins · data pre-seeded
              </p>
              <div className="mt-3 space-y-2 text-sm">
                <CredRow role="Advisor" email="advisor@bridgex.io" pass="advisor123" />
                <CredRow role="Client" email="amir@demo.io" pass="client123" />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl border border-line bg-surface p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-paper-2 text-ink-700">
                  <Icon name={f.icon} size={18} />
                </span>
                <h3 className="mt-3.5 text-[15px] font-semibold text-ink-900">{f.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-6 text-center text-sm text-muted">
        BridgeX 2.0 — front-end demo. Data lives in your browser.
      </footer>
    </div>
  );
}

function CredRow({ role, email, pass }: { role: string; email: string; pass: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="w-14 shrink-0 text-xs font-medium text-muted">{role}</span>
      <code className="flex-1 truncate text-[13px] text-ink-800">{email}</code>
      <code className="text-[13px] text-muted">{pass}</code>
    </div>
  );
}
