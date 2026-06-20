import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { attentionItems } from "../lib/selectors";
import { useStore } from "../lib/useStore";
import { initials } from "../lib/format";
import { Icon } from "./Icon";
import type { IconName } from "./Icon";
import { Logo } from "./ui";

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
}

export function Shell({ nav, children }: { nav: NavItem[]; children: ReactNode }) {
  const { user } = useAuth();
  const isAdvisor = user?.role === "advisor";

  return (
    <div className="min-h-screen bg-paper">
      <header className="nav-surface sticky top-0 z-40 border-b border-black/5">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:px-6">
          <Link to="/" className="mr-4 shrink-0">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end
                className={({ isActive }) =>
                  `px-3 py-1.5 text-sm transition-colors ${
                    isActive ? "font-semibold text-ink-900" : "font-medium text-ink-700/75 hover:text-ink-900"
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-black/10 bg-white/30 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-600 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-sage-500" />
              AI Online
            </span>
            {isAdvisor && <NotificationsMenu advisorId={user!.id} />}
            {user && <AccountMenu name={user.name} role={user.role} />}
          </div>
        </div>

        {/* Mobile nav row */}
        <div className="scroll-thin flex gap-1 overflow-x-auto px-3 pb-2 md:hidden">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium ${
                  isActive ? "bg-black/8 text-ink-900" : "text-ink-600"
                }`
              }
            >
              <Icon name={n.icon} size={15} />
              {n.label}
            </NavLink>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}

function AccountMenu({ name, role }: { name: string; role: string }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 text-ink-800 transition hover:bg-black/5"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-gradient-to-br from-[#44415f] to-[#2c2a40] text-[11px] font-semibold text-white">
          {initials(name)}
        </span>
        <span className="hidden max-w-[120px] truncate text-[13px] font-medium sm:block">{name}</span>
        <Icon name="chevronDown" size={15} className="hidden text-muted sm:block" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-surface shadow-lg shadow-black/5">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-semibold text-ink-900">{name}</p>
            <p className="text-xs capitalize text-muted">{role} account</p>
          </div>
          <button
            onClick={() => {
              signOut();
              navigate("/");
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-ink-700 hover:bg-paper-2"
          >
            <Icon name="logout" size={16} className="text-muted" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function NotificationsMenu({ advisorId }: { advisorId: string }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const items = useStore(() => attentionItems(advisorId), [advisorId]);
  const urgent = items.filter((i) => i.tone === "warn").length;

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const toneDot: Record<string, string> = {
    warn: "bg-clay-500",
    info: "bg-steel-500",
    good: "bg-sage-500",
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full p-2 text-ink-600 transition hover:bg-black/5 hover:text-ink-900"
        aria-label="Notifications"
      >
        <Icon name="bell" size={18} />
        {items.length > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-clay-500 px-1 text-[9px] font-bold text-white">
            {items.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-2xl border border-line bg-surface shadow-xl shadow-black/10">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-ink-900">Needs your attention</p>
            <span className="rounded-full bg-paper-2 px-2 py-0.5 text-xs font-semibold text-muted">
              {urgent} urgent
            </span>
          </div>
          <div className="max-h-[60vh] overflow-y-auto scroll-thin">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted">You're all caught up.</p>
            ) : (
              items.map((it) => (
                <button
                  key={it.id}
                  onClick={() => {
                    setOpen(false);
                    navigate(`/advisor/clients/${it.clientId}`);
                  }}
                  className="flex w-full items-start gap-3 border-b border-line px-4 py-3 text-left last:border-0 hover:bg-paper-2"
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${toneDot[it.tone]}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink-900">{it.clientName}</span>
                    <span className="block text-xs text-muted">{it.text}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{eyebrow}</div>}
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-ink-900 sm:text-[32px]">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition-colors hover:text-ink-700">
      <Icon name="arrowLeft" size={15} />
      {children}
    </Link>
  );
}
