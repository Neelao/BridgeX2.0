import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "../lib/auth";
import { Button, Logo, Icon } from "../components/ui";
import heroIllustration from "../public/illustration/Illustration3.png";

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
            <h1 className="text-[44px] font-semibold leading-[1.05] tracking-tight text-ink-900 sm:text-[56px]">
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
          </div>

          <div className="relative mx-auto w-full max-w-[380px]">
            <div className="rounded-[32px] bg-sky p-8">
              <img src={heroIllustration} alt="" className="w-full rounded-2xl" />
            </div>
            <Icon
              name="sparkle"
              size={48}
              strokeWidth={1.2}
              className="absolute -right-4 -top-4 text-gold-500"
            />
            <Icon
              name="sparkle"
              size={32}
              strokeWidth={1.2}
              className="absolute -bottom-2 -left-2 text-gold-500"
            />
          </div>
        </section>
      </main>
    </div>
  );
}
