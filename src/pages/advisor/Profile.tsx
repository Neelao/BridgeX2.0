import { useState } from "react";
import { useAuth } from "../../lib/auth";
import { Users } from "../../lib/db";
import { fmtDate } from "../../lib/format";
import { useToast } from "../../components/Toast";
import { PageHeader } from "../../components/Shell";
import { Avatar, Button, Card, CardHeader, Input } from "../../components/ui";
import { clientViews } from "../../lib/selectors";
import { useStore } from "../../lib/useStore";

export default function AdvisorProfile() {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const advisorId = user!.id;
  const clientCount = useStore(() => clientViews(advisorId).length, [advisorId]);

  const [form, setForm] = useState({
    name: user!.name,
    title: user!.title ?? "",
    agency: user!.agency ?? "",
    email: user!.email,
  });
  const [pwd, setPwd] = useState({ next: "", confirm: "" });
  const [error, setError] = useState<string>();

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    const email = form.email.trim();
    const existing = Users.byEmail(email);
    if (existing && existing.id !== advisorId) {
      setError("That email is already in use by another account.");
      return;
    }
    Users.update(advisorId, {
      name: form.name.trim() || user!.name,
      title: form.title.trim() || undefined,
      agency: form.agency.trim() || undefined,
      email: email || user!.email,
    });
    refresh();
    toast("Profile updated");
  }

  function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    if (pwd.next.length < 6) return setError("Password must be at least 6 characters.");
    if (pwd.next !== pwd.confirm) return setError("Passwords don't match.");
    Users.update(advisorId, { password: pwd.next });
    setPwd({ next: "", confirm: "" });
    toast("Password changed");
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Account" title="My profile" subtitle="Manage your advisor account and credentials." />

      <Card className="mb-6">
        <div className="flex items-center gap-4 p-5">
          <Avatar name={user!.name} size={56} />
          <div>
            <p className="text-lg font-semibold text-ink-900">{user!.name}</p>
            <p className="text-sm text-muted">
              {user!.title ?? "Advisor"}
              {user!.agency ? ` · ${user!.agency}` : ""}
            </p>
            <p className="mt-1 text-xs text-muted">
              {clientCount} client{clientCount === 1 ? "" : "s"} · joined {fmtDate(user!.createdAt)}
            </p>
          </div>
        </div>
      </Card>

      <form onSubmit={saveDetails} className="mb-6">
        <Card>
          <CardHeader title="Details" icon="users" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Input label="Full name" value={form.name} onChange={set("name")} />
            <Input label="Work email" type="email" value={form.email} onChange={set("email")} />
            <Input label="Title" value={form.title} onChange={set("title")} placeholder="Senior Career Advisor" />
            <Input label="Agency" value={form.agency} onChange={set("agency")} placeholder="BridgeX Careers" />
            {error && <p className="text-sm font-medium text-clay-600 sm:col-span-2">{error}</p>}
            <div className="sm:col-span-2">
              <Button type="submit">Save changes</Button>
            </div>
          </div>
        </Card>
      </form>

      <form onSubmit={savePassword}>
        <Card>
          <CardHeader title="Change password" icon="shield" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Input label="New password" type="password" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} hint="At least 6 characters" />
            <Input label="Confirm password" type="password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} />
            <div className="sm:col-span-2">
              <Button type="submit" variant="outline">Update password</Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}
