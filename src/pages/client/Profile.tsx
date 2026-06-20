import { useRef, useState } from "react";
import { useAuth } from "../../lib/auth";
import { Profiles } from "../../lib/db";
import { fmtDateTime } from "../../lib/format";
import type { ClientProfile } from "../../lib/types";
import { useToast } from "../../components/Toast";
import { PageHeader } from "../../components/Shell";
import { Button, Card, CardHeader, Icon, Input, Pill, Textarea } from "../../components/ui";

export default function Profile() {
  const { user } = useAuth();
  const toast = useToast();
  const clientId = user!.id;
  const existing = Profiles.forClient(clientId);

  const [form, setForm] = useState<ClientProfile>(
    existing ?? {
      clientId,
      headline: "",
      location: "",
      phone: "",
      yearsExperience: 0,
      cvText: "",
      cvFileName: undefined,
      updatedAt: 0,
    }
  );
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function update<K extends keyof ClientProfile>(key: K, value: ClientProfile[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith("text") || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
      const reader = new FileReader();
      reader.onload = () => {
        update("cvText", String(reader.result ?? ""));
        update("cvFileName", file.name);
      };
      reader.readAsText(file);
    } else {
      update("cvFileName", file.name);
    }
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    Profiles.upsert({ ...form, updatedAt: Date.now() });
    setSaved(true);
    toast("Profile saved");
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Your details"
        title="My profile"
        subtitle="Keep this current — your advisor and the AI use it to tailor your prep."
      />

      <form onSubmit={save} className="space-y-6">
        <Card>
          <CardHeader title="Personal info" icon="users" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Input label="Headline" value={form.headline} onChange={(e) => update("headline", e.target.value)} placeholder="Frontend Engineer, 4 yrs" />
            <Input label="Location" value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="Manchester, UK" />
            <Input label="Phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+44 …" />
            <Input
              label="Years of experience"
              type="number"
              min={0}
              value={form.yearsExperience}
              onChange={(e) => update("yearsExperience", Number(e.target.value))}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="CV / Resume" icon="file" action={form.cvFileName ? <Pill tone="sage">{form.cvFileName}</Pill> : undefined} />
          <div className="space-y-4 p-5">
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line-strong bg-paper px-4 py-7 text-center">
              <Icon name="file" size={22} className="text-muted" strokeWidth={1.4} />
              <p className="mt-2 text-sm text-muted">Upload a CV file — .txt / .md is read automatically; PDF/DOCX stored by name.</p>
              <input ref={fileRef} type="file" accept=".txt,.md,.pdf,.doc,.docx" onChange={onFile} className="hidden" />
              <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => fileRef.current?.click()}>
                Choose file
              </Button>
            </div>
            <Textarea
              label="CV content"
              value={form.cvText}
              onChange={(e) => update("cvText", e.target.value)}
              rows={9}
              placeholder="Paste your CV text here. The AI uses this to analyse your interview answers and tailor resume tips."
              hint="Tip: paste plain text from your resume so the AI can match it against target roles."
            />
          </div>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit">Save profile</Button>
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-sage-600">
              <Icon name="check" size={15} strokeWidth={2.2} />
              Saved
            </span>
          )}
          {existing?.updatedAt ? <span className="text-xs text-muted">Last updated {fmtDateTime(existing.updatedAt)}</span> : null}
        </div>
      </form>
    </div>
  );
}
