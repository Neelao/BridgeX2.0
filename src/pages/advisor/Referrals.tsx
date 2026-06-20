import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { useStore } from "../../lib/useStore";
import { Opportunities, Referrals, Users, uid } from "../../lib/db";
import { matchContextFor, referralFunnel } from "../../lib/selectors";
import { matchCandidate } from "../../lib/ai";
import { fmtDate } from "../../lib/format";
import type { MatchResult, Opportunity, Referral, ReferralStatus } from "../../lib/types";
import { useToast } from "../../components/Toast";
import { PageHeader } from "../../components/Shell";
import { Avatar, Button, Card, CardHeader, EmptyState, Icon, Pill, ReferralTag, Select } from "../../components/ui";
import type { IconName } from "../../components/Icon";

const KIND_META: Record<Opportunity["kind"], { label: string; icon: IconName }> = {
  company: { label: "Partner company", icon: "briefcase" },
  recruiter: { label: "Recruiter network", icon: "users" },
  grad: { label: "Graduate programme", icon: "flag" },
  internship: { label: "Internship", icon: "target" },
};

export default function ReferralsPage() {
  const { user } = useAuth();
  const advisorId = user!.id;

  const opportunities = useStore(() => Opportunities.all(), []);
  const referrals = useStore(() => Referrals.forAdvisor(advisorId), [advisorId]);
  const clients = useStore(() => Users.clientsOf(advisorId), [advisorId]);

  return (
    <div>
      <PageHeader
        eyebrow="Employer referral portal"
        title="Referrals & matching"
        subtitle="AI matches your candidates to partner companies, recruiters, and programmes — you make the intro."
      />

      {referrals.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Active referrals</h2>
          <Card>
            <div className="divide-y divide-line">
              {referrals.map((r) => (
                <ReferralRow key={r.id} referral={r} />
              ))}
            </div>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Opportunities</h2>
          {opportunities.length === 0 ? (
            <EmptyState title="No opportunities" body="Partner opportunities will appear here." />
          ) : (
            <div className="space-y-5">
              {opportunities.map((o) => (
                <OpportunityCard key={o.id} opportunity={o} advisorId={advisorId} clients={clients} referrals={referrals} />
              ))}
            </div>
          )}
        </div>

        {/* Pipeline sidebar */}
        <div className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <PipelineCard advisorId={advisorId} />
        </div>
      </div>
    </div>
  );
}

function PipelineCard({ advisorId }: { advisorId: string }) {
  const funnel = useStore(() => referralFunnel(advisorId), [advisorId]);
  const stages: { key: ReferralStatus; label: string }[] = [
    { key: "suggested", label: "Suggested" },
    { key: "sent", label: "Referred" },
    { key: "interviewing", label: "Interviewing" },
    { key: "placed", label: "Placed" },
    { key: "declined", label: "Declined" },
  ];
  const max = Math.max(1, ...stages.map((s) => funnel.counts[s.key]));

  return (
    <>
      <Card>
        <CardHeader title="Referral pipeline" icon="chart" />
        <div className="space-y-3 p-5">
          {funnel.total === 0 ? (
            <p className="py-2 text-center text-sm text-muted">No referrals yet. Refer a matched candidate to get started.</p>
          ) : (
            stages.map((s) => {
              const n = funnel.counts[s.key];
              return (
                <div key={s.key}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-ink-700">{s.label}</span>
                    <span className="tnum text-muted">{n}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-paper-2">
                    <div
                      className={`h-full rounded-full ${s.key === "placed" ? "bg-sage-500" : s.key === "declined" ? "bg-clay-500" : "bg-steel-500"}`}
                      style={{ width: `${(n / max) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="px-5 py-4">
          <p className="text-[12px] font-medium text-muted">Total referrals</p>
          <p className="mt-1.5 text-[28px] font-semibold leading-none tnum text-ink-900">{funnel.total}</p>
        </Card>
        <Card className="px-5 py-4">
          <p className="text-[12px] font-medium text-muted">Placed this month</p>
          <p className="mt-1.5 text-[28px] font-semibold leading-none tnum text-sage-600">{funnel.placedThisMonth}</p>
        </Card>
      </div>
    </>
  );
}

function ReferralRow({ referral }: { referral: Referral }) {
  const client = Users.byId(referral.clientId);
  const opp = Opportunities.byId(referral.opportunityId);
  function setStatus(status: ReferralStatus) {
    Referrals.upsert({ ...referral, status });
  }
  return (
    <div className="flex flex-wrap items-center gap-3 px-5 py-3.5">
      {client && <Avatar name={client.name} size={36} />}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink-900">{client?.name ?? "Client"}</p>
        <p className="truncate text-xs text-muted">
          {opp ? `${opp.role} · ${opp.org}` : "Opportunity"} · {fmtDate(referral.at)}
        </p>
      </div>
      <ReferralTag status={referral.status} />
      <Select value={referral.status} onChange={(e) => setStatus(e.target.value as ReferralStatus)} className="!w-auto !py-1.5 text-xs">
        {(["suggested", "sent", "interviewing", "placed", "declined"] as ReferralStatus[]).map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </Select>
      <button onClick={() => Referrals.remove(referral.id)} className="text-muted transition hover:text-clay-500" aria-label="Remove referral">
        <Icon name="x" size={16} />
      </button>
    </div>
  );
}

function OpportunityCard({
  opportunity,
  advisorId,
  clients,
  referrals,
}: {
  opportunity: Opportunity;
  advisorId: string;
  clients: ReturnType<typeof Users.clientsOf>;
  referrals: Referral[];
}) {
  const toast = useToast();
  const [showAll, setShowAll] = useState(false);
  const meta = KIND_META[opportunity.kind];

  const matches: MatchResult[] = clients
    .map((c) => matchCandidate(opportunity, matchContextFor(c)))
    .sort((a, b) => b.score - a.score);
  const shown = showAll ? matches : matches.slice(0, 3);

  function refer(clientId: string) {
    const existing = referrals.find((r) => r.clientId === clientId && r.opportunityId === opportunity.id);
    if (existing) {
      toast("Already referred", "info");
      return;
    }
    Referrals.upsert({
      id: uid("ref"),
      advisorId,
      clientId,
      opportunityId: opportunity.id,
      status: "sent",
      at: Date.now(),
    });
    toast("Candidate referred");
  }

  return (
    <Card>
      <CardHeader
        title={opportunity.org}
        icon={meta.icon}
        action={<Pill tone="steel">{meta.label}</Pill>}
      />
      <div className="p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-ink-900">{opportunity.role}</p>
          <p className="text-xs text-muted">{opportunity.location}</p>
        </div>
        <p className="mt-1 text-sm text-muted">{opportunity.description}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {opportunity.skills.map((s) => (
            <span key={s} className="rounded-full bg-paper-2 px-2.5 py-0.5 text-xs font-medium text-ink-700">{s}</span>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-2">
          <Icon name="sparkle" size={14} className="text-steel-500" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">AI-matched candidates</p>
        </div>

        {clients.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Add clients to see matches.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {shown.map((m) => {
              const client = Users.byId(m.clientId)!;
              const referred = referrals.find((r) => r.clientId === m.clientId && r.opportunityId === opportunity.id);
              return (
                <div key={m.clientId} className="flex items-center gap-3 rounded-xl border border-line p-3">
                  <div className="flex w-10 shrink-0 flex-col items-center">
                    <span className={`text-sm font-bold tnum ${m.score >= 75 ? "text-sage-600" : m.score >= 55 ? "text-gold-600" : "text-muted"}`}>{m.score}</span>
                    <span className="text-[9px] uppercase tracking-wide text-muted">match</span>
                  </div>
                  <Avatar name={client.name} size={34} />
                  <div className="min-w-0 flex-1">
                    <Link to={`/advisor/clients/${client.id}`} className="truncate text-sm font-semibold text-ink-900 hover:underline">
                      {client.name}
                    </Link>
                    <p className="truncate text-xs text-muted">{m.reasons[0]}</p>
                  </div>
                  {referred ? (
                    <ReferralTag status={referred.status} />
                  ) : (
                    <Button size="sm" variant="outline" icon="arrowUpRight" onClick={() => refer(m.clientId)}>Refer</Button>
                  )}
                </div>
              );
            })}
            {matches.length > 3 && (
              <button onClick={() => setShowAll((v) => !v)} className="text-[13px] font-semibold text-steel-600 hover:text-steel-700">
                {showAll ? "Show top matches" : `Show all ${matches.length} candidates`}
              </button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
