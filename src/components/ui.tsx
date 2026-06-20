import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";
import { avatarColor, initials, scoreBand } from "../lib/format";
import { Icon } from "./Icon";
import type { IconName } from "./Icon";

export { Icon };
export type { IconName };

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(20,22,30,0.04)] ${className}`}>
      {children}
    </div>
  );
}

export function Logo({ onDark = false }: { onDark?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-[11px] text-[15px] font-bold shadow-sm ${
          onDark
            ? "bg-white/15 text-white"
            : "bg-gradient-to-br from-[#44415f] to-[#2c2a40] text-white"
        }`}
      >
        B
      </span>
      <span className={`text-[16px] font-semibold tracking-tight ${onDark ? "text-white" : "text-ink-900"}`}>
        Bridge<span className={onDark ? "text-steel-300" : "text-steel-500"}>X</span>
      </span>
    </span>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  icon,
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "accent" | "ghost" | "outline" | "danger";
  size?: "sm" | "md";
  icon?: IconName;
}) {
  const variants: Record<string, string> = {
    primary: "bg-ink-900 text-white hover:bg-ink-800 disabled:bg-ink-600",
    accent: "bg-steel-500 text-white hover:bg-steel-600 disabled:bg-steel-300",
    ghost: "text-ink-700 hover:bg-paper-2",
    outline: "border border-line-strong bg-surface text-ink-800 hover:bg-paper-2",
    danger: "text-clay-600 hover:bg-clay-50",
  };
  const sizes: Record<string, string> = {
    sm: "px-3.5 py-1.5 text-[13px]",
    md: "px-5 py-2.5 text-sm",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-70 ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === "sm" ? 15 : 16} />}
      {children}
    </button>
  );
}

const fieldClass =
  "w-full rounded-lg border border-line-strong bg-surface px-3.5 py-2.5 text-sm text-ink-900 outline-none transition placeholder:text-muted/70 focus:border-steel-400 focus:ring-2 focus:ring-steel-100";

export function Input({
  label,
  hint,
  className = "",
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-[13px] font-medium text-ink-800">{label}</span>}
      <input className={`${fieldClass} ${className}`} {...rest} />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Textarea({
  label,
  hint,
  className = "",
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; hint?: string }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-[13px] font-medium text-ink-800">{label}</span>}
      <textarea className={`${fieldClass} resize-none ${className}`} {...rest} />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Select({
  label,
  className = "",
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-[13px] font-medium text-ink-800">{label}</span>}
      <select className={`${fieldClass} ${className}`} {...rest}>
        {children}
      </select>
    </label>
  );
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: avatarColor(name), fontSize: size * 0.38 }}
    >
      {initials(name)}
    </div>
  );
}

export function ScoreBadge({ score, withLabel = true }: { score: number; withLabel?: boolean }) {
  const band = scoreBand(score);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ background: band.bg, color: band.color }}
    >
      <span className="tnum">{score}</span>
      {withLabel && <span className="font-medium">{band.label}</span>}
    </span>
  );
}

export function ScoreRing({ score, size = 76, strokeWidth = 6 }: { score: number; size?: number; strokeWidth?: number }) {
  const band = scoreBand(score);
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (score / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#e9ebf2" strokeWidth={strokeWidth} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={band.color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          fill="none"
          style={{ transition: "stroke-dashoffset .7s cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold tnum" style={{ color: band.color }}>
          {score}
        </span>
      </div>
    </div>
  );
}

export function Meter({ value, max = 100, tone = "steel" }: { value: number; max?: number; tone?: "steel" | "sage" | "gold" | "clay" | "ink" }) {
  const colors: Record<string, string> = {
    steel: "bg-steel-500",
    sage: "bg-sage-500",
    gold: "bg-gold-500",
    clay: "bg-clay-500",
    ink: "bg-ink-700",
  };
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper-2">
      <div className={`h-full rounded-full ${colors[tone]} transition-all duration-700`} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
    </div>
  );
}

export function Pill({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "steel" | "sage" | "gold" | "clay" }) {
  const tones: Record<string, string> = {
    slate: "bg-paper-2 text-ink-600",
    steel: "bg-steel-50 text-steel-700",
    sage: "bg-sage-50 text-sage-700",
    gold: "bg-gold-50 text-gold-600",
    clay: "bg-clay-50 text-clay-600",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

/** Outlined rounded tag, LuckyJob job-card style. */
export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-ink-900/12 bg-white/60 px-3 py-1 text-xs font-medium text-ink-700">
      {children}
    </span>
  );
}

/** Small rounded count chip shown beside a heading (e.g. "387"). */
export function CountPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-line bg-surface px-3 py-0.5 text-sm font-semibold tnum text-muted">
      {children}
    </span>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{children}</p>;
}

export function Stat({
  label,
  value,
  sub,
  trend,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  trend?: { dir: "up" | "down"; text: string; good?: boolean };
}) {
  const trendColor = trend ? (trend.good ?? trend.dir === "up" ? "text-sage-600" : "text-clay-500") : "";
  return (
    <Card className="px-5 py-4">
      <p className="text-[12px] font-medium text-muted">{label}</p>
      <p className="mt-1.5 text-[32px] font-semibold leading-none tracking-tight text-ink-900 tnum">{value}</p>
      {trend ? (
        <p className={`mt-2 text-xs font-medium ${trendColor}`}>
          {trend.dir === "up" ? "↑" : "↓"} {trend.text}
        </p>
      ) : sub ? (
        <p className="mt-2 text-xs text-muted">{sub}</p>
      ) : (
        <p className="mt-2 text-xs text-transparent">·</p>
      )}
    </Card>
  );
}

export function CardHeader({ title, icon, action }: { title: string; icon?: IconName; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-line px-5 py-4">
      <div className="flex items-center gap-2.5">
        {icon && <Icon name={icon} size={17} className="text-muted" />}
        <h2 className="text-[15px] font-semibold text-ink-900">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line-strong bg-surface px-6 py-14 text-center">
      <p className="text-sm font-semibold text-ink-800">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm text-muted">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function AiBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
      <Icon name="sparkle" size={11} className="text-steel-500" strokeWidth={1.4} />
      AI
    </span>
  );
}

export function LinkArrow({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 text-[13px] font-semibold text-steel-600 transition-colors hover:text-steel-700">
      {children}
      <Icon name="arrowRight" size={14} />
    </Link>
  );
}
