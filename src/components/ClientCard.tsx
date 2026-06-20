import { Link } from "react-router-dom";
import type { ClientView } from "../lib/selectors";
import { fmtDate } from "../lib/format";
import { Avatar, Icon, Tag } from "./ui";

const PASTELS = ["bg-peach", "bg-mint", "bg-lilac", "bg-sky", "bg-blush", "bg-stone"] as const;

function pastelFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PASTELS[h % PASTELS.length];
}

export function ClientCard({ view, index = 0 }: { view: ClientView; index?: number }) {
  const { user, readiness, interviewCount, hasProfile, targetCompany } = view;
  const pastel = pastelFor(user.id);

  return (
    <Link
      to={`/advisor/clients/${user.id}`}
      className="rise group block overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_1px_2px_rgba(20,22,30,0.04)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(20,22,30,0.10)]"
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      {/* Pastel header */}
      <div className={`${pastel} p-5`}>
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-ink-700">
            Joined {fmtDate(user.createdAt)}
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-ink-700 transition group-hover:bg-white">
            <Icon name="arrowUpRight" size={15} />
          </span>
        </div>

        <div className="mt-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-ink-600">
              {targetCompany ? `Targeting ${targetCompany}` : "No target company"}
            </p>
            <h3 className="mt-1 text-[22px] font-semibold leading-tight tracking-tight text-ink-900">
              {user.name}
            </h3>
            <p className="mt-0.5 text-sm text-ink-600">{user.targetRole ?? "No target role"}</p>
          </div>
          <Avatar name={user.name} size={46} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Tag>{interviewCount > 0 ? `${interviewCount} interview${interviewCount > 1 ? "s" : ""}` : "No interview"}</Tag>
          <Tag>{hasProfile ? "CV ready" : "No CV"}</Tag>
          {typeof readiness === "number" && <Tag>{readiness >= 80 ? "Interview-ready" : readiness >= 60 ? "Developing" : "Needs coaching"}</Tag>}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          {typeof readiness === "number" ? (
            <>
              <p className="text-xl font-semibold tnum text-ink-900">
                {readiness}
                <span className="text-sm font-medium text-muted">/100</span>
              </p>
              <p className="text-xs text-muted">readiness score</p>
            </>
          ) : (
            <>
              <p className="text-base font-semibold text-ink-700">Not scored</p>
              <p className="text-xs text-muted">no interview yet</p>
            </>
          )}
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-4 py-2 text-[13px] font-medium text-white transition group-hover:bg-ink-800">
          View
          <Icon name="arrowRight" size={14} />
        </span>
      </div>
    </Link>
  );
}
