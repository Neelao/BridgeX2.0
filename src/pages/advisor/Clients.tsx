import { useState } from "react";
import { useAuth } from "../../lib/auth";
import { useStore } from "../../lib/useStore";
import { clientViews, segmentsOf } from "../../lib/selectors";
import type { Segment } from "../../lib/selectors";
import { Users, uid } from "../../lib/db";
import type { User } from "../../lib/types";
import { PageHeader } from "../../components/Shell";
import { Button, CountPill, EmptyState, Icon, Input } from "../../components/ui";
import { ClientCard } from "../../components/ClientCard";
import { Modal } from "../../components/Modal";
import { FormError } from "../../components/AuthLayout";

export default function Clients() {
  const { user } = useAuth();
  const advisorId = user!.id;
  const views = useStore(() => clientViews(advisorId), [advisorId]);
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [query, setQuery] = useState("");
  const [segment, setSegment] = useState<Segment | "all">("all");

  const SEGMENTS: { key: Segment | "all"; label: string }[] = [
    { key: "all", label: "All" },
    { key: "improving", label: "Improving" },
    { key: "struggling", label: "Struggling" },
    { key: "referral-ready", label: "Referral-ready" },
    { key: "inactive", label: "Inactive" },
  ];

  const counts = (key: Segment | "all") =>
    key === "all" ? views.length : views.filter((v) => segmentsOf(v).includes(key as Segment)).length;

  const filtered = views.filter((v) => {
    const matchesQuery = `${v.user.name} ${v.user.targetRole ?? ""} ${v.targetCompany ?? ""}`
      .toLowerCase()
      .includes(query.toLowerCase());
    const matchesSegment = segment === "all" || segmentsOf(v).includes(segment as Segment);
    return matchesQuery && matchesSegment;
  });

  return (
    <div>
      <PageHeader
        eyebrow="Client management"
        title={
          <span className="flex items-center gap-3">
            Clients <CountPill>{views.length}</CountPill>
          </span>
        }
        subtitle="Create accounts, share logins, and track every job seeker's readiness."
        action={<Button icon="plus" onClick={() => setOpen(true)}>Add client</Button>}
      />

      {views.length > 0 && (
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {SEGMENTS.map((s) => {
              const active = segment === s.key;
              const n = counts(s.key);
              return (
                <button
                  key={s.key}
                  onClick={() => setSegment(s.key)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition ${
                    active ? "border-transparent bg-ink-900 text-white" : "border-line-strong bg-surface text-ink-700 hover:bg-paper-2"
                  }`}
                >
                  {s.label}
                  <span className={`text-xs ${active ? "text-white/70" : "text-muted"}`}>{n}</span>
                </button>
              );
            })}
          </div>
          <div className="relative sm:w-64">
            <Icon name="search" size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input
              placeholder="Search clients…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-full border border-line-strong bg-surface py-2.5 pl-11 pr-4 text-sm outline-none transition placeholder:text-muted/70 focus:border-steel-400 focus:ring-2 focus:ring-steel-100"
            />
          </div>
        </div>
      )}

      {views.length === 0 ? (
        <EmptyState
          title="No clients yet"
          body="When you add a client, BridgeX generates their login. Share it so they can sign in and start mock interviews."
          action={<Button icon="plus" onClick={() => setOpen(true)}>Add your first client</Button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="No matches" body="No clients match your search. Try a different name, role, or company." />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((v, i) => (
            <ClientCard key={v.user.id} view={v} index={i} />
          ))}
        </div>
      )}

      <AddClientModal
        open={open}
        advisorId={advisorId}
        onClose={() => setOpen(false)}
        onCreated={(c) => {
          setOpen(false);
          setCopied(false);
          setCreated(c);
        }}
      />

      <Modal open={!!created} onClose={() => setCreated(null)} title="Client account created">
        {created && (
          <div className="space-y-4">
            <p className="text-sm text-ink-700">
              Share these credentials with <strong className="font-semibold text-ink-900">{created.name}</strong>. They'll
              sign in on the job seeker page — you stay signed in as the advisor.
            </p>
            <div className="space-y-2.5 rounded-lg border border-line bg-paper-2 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted">Email</span>
                <code className="font-semibold text-ink-900">{created.email}</code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Password</span>
                <code className="font-semibold text-ink-900">{created.password}</code>
              </div>
            </div>
            <Button
              icon={copied ? "check" : "copy"}
              className="w-full"
              onClick={() => {
                navigator.clipboard?.writeText(`Email: ${created.email}\nPassword: ${created.password}`);
                setCopied(true);
              }}
            >
              {copied ? "Copied to clipboard" : "Copy credentials"}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setCreated(null)}>
              Done
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function AddClientModal({
  open,
  advisorId,
  onClose,
  onCreated,
}: {
  open: boolean;
  advisorId: string;
  onClose: () => void;
  onCreated: (c: { email: string; password: string; name: string }) => void;
}) {
  const [form, setForm] = useState({ name: "", email: "", targetRole: "", password: "" });
  const [error, setError] = useState<string>();

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  function genPassword() {
    setForm((f) => ({ ...f, password: `bx-${Math.random().toString(36).slice(2, 7)}` }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    if (!form.name.trim() || !form.email.trim()) return setError("Name and email are required.");
    if (Users.byEmail(form.email)) return setError("That email is already in use.");
    const password = form.password.trim() || `bx-${Math.random().toString(36).slice(2, 7)}`;
    const client: User = {
      id: uid("cli"),
      role: "client",
      email: form.email.trim(),
      password,
      name: form.name.trim(),
      advisorId,
      targetRole: form.targetRole.trim() || undefined,
      createdAt: Date.now(),
    };
    Users.create(client);
    onCreated({ email: client.email, password, name: client.name });
    setForm({ name: "", email: "", targetRole: "", password: "" });
  }

  return (
    <Modal open={open} onClose={onClose} title="Add a client">
      <form onSubmit={submit} className="space-y-4">
        <FormError message={error} />
        <Input label="Full name" value={form.name} onChange={set("name")} placeholder="Jordan Lee" required />
        <Input label="Email (their login)" type="email" value={form.email} onChange={set("email")} placeholder="jordan@email.com" required />
        <Input label="Target role" value={form.targetRole} onChange={set("targetRole")} placeholder="Backend Engineer" />
        <div>
          <div className="flex items-end gap-2">
            <Input
              label="Temporary password"
              value={form.password}
              onChange={set("password")}
              placeholder="Auto-generated if blank"
              className="flex-1"
            />
            <Button type="button" variant="outline" onClick={genPassword}>
              Generate
            </Button>
          </div>
          <p className="mt-1.5 text-xs text-muted">You'll share this with the client after creating.</p>
        </div>
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1">
            Create account
          </Button>
        </div>
      </form>
    </Modal>
  );
}
