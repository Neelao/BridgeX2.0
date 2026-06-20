import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "../lib/auth";
import { Button, Logo, Icon } from "../components/ui";
import type { IconName } from "../components/Icon";
import heroIllustration from "../public/illustration/Illustration3.png";

const FEATURES: { icon: IconName; title: string; body: string }[] = [
  { icon: "mic", title: "AI mock interviews", body: "Candidates practise with an adaptive AI interviewer, anytime, on any target role." },
  { icon: "chart", title: "Instant readiness scores", body: "Every interview is analysed against the CV and job criteria — communication, confidence, technical." },
  { icon: "file", title: "Resume tailoring", body: "AI turns a posting's requirements into concrete resume actions and keywords." },
  { icon: "bell", title: "Proactive follow-ups", body: "Morning briefings, reminders and progress alerts so no client ever slips." },
];

const STEPS: { n: string; title: string; body: string }[] = [
  { n: "01", title: "Advisors onboard clients", body: "An advisor creates each job seeker's account and shares the login — there's no public sign-up." },
  { n: "02", title: "Clients run mock interviews", body: "An AI interviewer probes for detail; answers are scored instantly against the target role." },
  { n: "03", title: "Advisors coach & refer", body: "Get a readiness summary, tailor the resume, then refer the candidate once they're employer-ready." },
];

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate(user.role === "advisor" ? "/advisor" : "/client", { replace: true });
  }, [user, navigate]);

  return (
    <div className="min-h-screen">
      <header className="nav-surface sticky top-0 z-30 border-b border-black/5">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-5 sm:px-6">
          <Logo />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 sm:px-6">
        {/* Hero */}
        <section className="grid items-center gap-12 py-16 lg:grid-cols-[1.1fr_1fr] lg:py-24">
          <div>
            <h1 className="text-[44px] font-semibold leading-[1.05] tracking-tight text-ink-900 sm:text-[56px]">
              Your expertise,
              <br />
              their <span className="text-steel-500">future</span>.
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
          </div>

          <div className="relative mx-auto w-full max-w-[380px]">
            <div className="rounded-[32px] bg-sky p-8">
              <img src={heroIllustration} alt="" className="w-full rounded-2xl" />
            </div>
            <Icon name="sparkle" size={48} strokeWidth={1.2} className="absolute -right-4 -top-4 text-gold-500" />
            <Icon name="sparkle" size={32} strokeWidth={1.2} className="absolute -bottom-2 -left-2 text-gold-500" />
          </div>
        </section>

        {/* What BridgeX does */}
        <section className="py-14 lg:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-steel-600">Why BridgeX</p>
            <h2 className="mt-3 text-[30px] font-semibold tracking-tight text-ink-900 sm:text-[36px]">
              One platform for the whole journey to hired.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-600">
              BridgeX gives career advisors an AI co-pilot for their entire client roster — turning hours of admin into minutes, so they can spend their time actually changing careers.
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-line bg-surface p-6 shadow-[0_1px_2px_rgba(20,22,30,0.04)]">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-steel-50 text-steel-600">
                  <Icon name={f.icon} size={19} />
                </span>
                <h3 className="mt-4 text-[15px] font-semibold text-ink-900">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="py-14 lg:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-steel-600">How it works</p>
            <h2 className="mt-3 text-[30px] font-semibold tracking-tight text-ink-900 sm:text-[36px]">From first session to first offer.</h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-line bg-surface p-6 shadow-[0_1px_2px_rgba(20,22,30,0.04)]">
                <span className="text-[30px] font-bold tracking-tight text-steel-500/40 tnum">{s.n}</span>
                <h3 className="mt-2 text-[15px] font-semibold text-ink-900">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* About the firm */}
        <section className="py-14 lg:py-16">
          <div className="rounded-3xl border border-line bg-surface p-8 shadow-[0_1px_2px_rgba(20,22,30,0.04)] sm:p-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-steel-600">About BridgeX</p>
            <h2 className="mt-3 max-w-3xl text-[26px] font-semibold leading-tight tracking-tight text-ink-900 sm:text-[32px]">
              AI-powered career advisory, built for the people doing the coaching.
            </h2>
            <p className="mt-5 max-w-3xl text-[16px] leading-relaxed text-ink-600">
              BridgeX 2.0 helps career advisors, bootcamps and employment programmes move more job
              seekers into work. Candidates complete mock interviews analysed by AI against their CV
              and target role; advisors get instant readiness summaries, an approval-gated pipeline,
              and an employer referral portal — all in one place.
            </p>
            <div className="mt-7 flex flex-wrap gap-x-10 gap-y-3 text-sm font-medium text-ink-700">
              <span className="flex items-center gap-2"><Icon name="check" size={16} className="text-sage-600" strokeWidth={2.2} /> Two tailored interfaces</span>
              <span className="flex items-center gap-2"><Icon name="check" size={16} className="text-sage-600" strokeWidth={2.2} /> Advisor-controlled access</span>
              <span className="flex items-center gap-2"><Icon name="check" size={16} className="text-sage-600" strokeWidth={2.2} /> Employer referral matching</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 sm:px-6">
          <Logo />
          <p className="text-sm text-muted">© {new Date().getFullYear()} BridgeX — AI career advisory platform.</p>
        </div>
      </footer>
    </div>
  );
}
