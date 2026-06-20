import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo, Icon } from "./ui";
import type { IconName } from "./Icon";
import clientIllustration from "../public/illustration/Illustration1.png";
import advisorIllustration from "../public/illustration/Illustration2.png";

interface BrandChip {
  icon: IconName;
  label: string;
  tone: "sage" | "steel" | "gold";
  className: string;
}

const CHIPS: Record<"advisor" | "client", BrandChip[]> = {
  advisor: [
    { icon: "check", label: "Roster summarized", tone: "sage", className: "top-0 right-1" },
    { icon: "sparkle", label: "AI co-pilot online", tone: "steel", className: "-top-3 -left-2" },
    { icon: "calendar", label: "Follow-ups handled", tone: "gold", className: "left-[38%] -bottom-3" },
  ],
  client: [
    { icon: "mic", label: "Mock interview ready", tone: "steel", className: "-left-6 -top-2" },
    { icon: "chart", label: "Readiness 86%", tone: "sage", className: "-right-8 top-[36%]" },
    { icon: "sparkle", label: "Feedback in seconds", tone: "gold", className: "left-6 -bottom-3" },
  ],
};

const CHIP_TONE_TEXT: Record<BrandChip["tone"], string> = {
  sage: "text-sage-600",
  steel: "text-steel-600",
  gold: "text-gold-600",
};

function BrandChips({ accent }: { accent: "advisor" | "client" }) {
  return (
    <>
      {CHIPS[accent].map((chip) => (
        <div
          key={chip.label}
          className={`absolute flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1.5 shadow-md shadow-black/5 ${chip.className}`}
        >
          <Icon name={chip.icon} size={13} className={CHIP_TONE_TEXT[chip.tone]} />
          <span className="whitespace-nowrap text-[11px] font-semibold text-ink-800">{chip.label}</span>
        </div>
      ))}
    </>
  );
}

const ILLUSTRATIONS: Record<"advisor" | "client", string> = {
  advisor: advisorIllustration,
  client: clientIllustration,
};

/** Brand-panel artwork — a hand-picked illustration per audience, dropped into src/public/illustration. */
function BrandIllustration({ accent }: { accent: "advisor" | "client" }) {
  return (
    <div className="relative mx-auto w-full max-w-[280px]">
      <img src={ILLUSTRATIONS[accent]} alt="" className="w-full rounded-2xl" />
      <BrandChips accent={accent} />
    </div>
  );
}

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
  const heading =
    accent === "advisor"
      ? "Run every client relationship like clockwork."
      : "Walk into every interview ready.";
  const description =
    accent === "advisor"
      ? "BridgeX keeps your whole roster's readiness, coaching notes, and follow-ups in one place, with an AI co-pilot watching for what needs you next."
      : "Practice real interview questions with an AI interviewer, get instant structured feedback, and watch your readiness score climb before the real thing.";

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <div
        className={`relative hidden flex-col justify-between border-r border-line p-12 lg:flex ${
          accent === "client" ? "bg-[#ffceb2]" : "bg-[#cafad9]"
        }`}
      >
        <div className="flex items-center gap-2 text-[12px] font-medium text-ink-600">
          <Link to="/" className="flex items-center gap-2">
            <Logo />
          </Link>
          <Icon name="chevronRight" size={12} className="text-ink-600/50" />
          <span>{accent === "advisor" ? "Career advisors" : "Job seekers"}</span>
        </div>

        <div>
          <h2 className="max-w-md text-[32px] font-semibold leading-tight tracking-tight text-ink-900">
            {heading}
          </h2>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-ink-700/80">{description}</p>
          <div className="mt-10">
            <BrandIllustration accent={accent} />
          </div>
        </div>

        <div />
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
