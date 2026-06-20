import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { useStore } from "../../lib/useStore";
import { Companies, Interviews, Profiles, Resumes, Users } from "../../lib/db";
import { aiDelay, generateResume } from "../../lib/ai";
import { fmtDateTime } from "../../lib/format";
import type { Resume } from "../../lib/types";
import { useToast } from "../../components/Toast";
import { PageHeader, BackLink } from "../../components/Shell";
import { AiBadge, Avatar, Button, Card, CardHeader, EmptyState, Icon, Input, Select, Textarea } from "../../components/ui";

const BLANK = (clientId: string): Resume => ({
  clientId,
  headline: "",
  summary: "",
  skills: [],
  experience: "",
  education: "",
  updatedAt: 0,
});

export default function ResumeWorkspace() {
  const { clientId = "" } = useParams();
  const { user } = useAuth();
  const advisorId = user!.id;
  const toast = useToast();

  const client = useStore(() => Users.byId(clientId), [clientId]);
  const profile = useStore(() => Profiles.forClient(clientId), [clientId]);
  const companies = useStore(() => Companies.forClient(clientId), [clientId]);
  const saved = useStore(() => Resumes.forClient(clientId), [clientId]);
  const analysis = useStore(() => Interviews.latestComplete(clientId)?.analysis, [clientId]);

  const [draft, setDraft] = useState<Resume>(() => saved ?? BLANK(clientId));
  const [targetId, setTargetId] = useState(saved?.generatedFromCompanyId ?? companies[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [skillsText, setSkillsText] = useState(() => (saved?.skills ?? []).join(", "));

  if (!client || client.advisorId !== advisorId) {
    return (
      <div>
        <BackLink to="/advisor/clients">All clients</BackLink>
        <EmptyState title="Client not found" body="This client isn't on your roster." action={<Link to="/advisor/clients"><Button>Back to clients</Button></Link>} />
      </div>
    );
  }

  const hasInputs = !!profile?.cvText?.trim() || !!analysis || companies.length > 0;

  async function generate() {
    setBusy(true);
    await aiDelay(1100);
    const target = companies.find((c) => c.id === targetId);
    const gen = generateResume(profile, analysis, target);
    const next: Resume = { ...draft, ...gen, clientId, updatedAt: Date.now() };
    setDraft(next);
    setSkillsText(gen.skills.join(", "));
    setBusy(false);
    toast("AI drafted a tailored resume");
  }

  function save() {
    const next: Resume = {
      ...draft,
      clientId,
      skills: skillsText.split(",").map((s) => s.trim()).filter(Boolean),
      generatedFromCompanyId: targetId || undefined,
      updatedAt: Date.now(),
    };
    Resumes.upsert(next);
    setDraft(next);
    toast("Resume saved");
  }

  function copyAll() {
    const skills = skillsText.split(",").map((s) => s.trim()).filter(Boolean);
    const text = [
      client!.name,
      draft.headline,
      "",
      "SUMMARY",
      draft.summary,
      "",
      "SKILLS",
      skills.join(" · "),
      "",
      "EXPERIENCE",
      draft.experience,
      draft.education ? `\nEDUCATION\n${draft.education}` : "",
    ].join("\n");
    navigator.clipboard?.writeText(text);
    toast("Resume copied to clipboard");
  }

  const target = companies.find((c) => c.id === targetId);

  return (
    <div>
      <BackLink to={`/advisor/clients/${clientId}`}>Back to {client.name}</BackLink>

      <PageHeader
        eyebrow="Resume workspace"
        title={
          <span className="flex items-center gap-3">
            {client.name}'s resume <AiBadge />
          </span>
        }
        subtitle="AI drafts from the CV, interview analysis, and target criteria — you refine and share."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" icon="copy" onClick={copyAll}>Copy</Button>
            <Button icon="check" onClick={save}>Save</Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Editor */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Document" icon="file" />
            <div className="space-y-4 p-5">
              <Input label="Name headline" value={draft.headline} onChange={(e) => setDraft({ ...draft, headline: e.target.value })} placeholder="Frontend Engineer" />
              <Textarea label="Professional summary" value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} rows={4} placeholder="A punchy 2–3 line summary positioning the client for the role." />
              <Input label="Skills (comma separated)" value={skillsText} onChange={(e) => setSkillsText(e.target.value)} placeholder="react, typescript, leadership" />
              <Textarea label="Experience" value={draft.experience} onChange={(e) => setDraft({ ...draft, experience: e.target.value })} rows={8} placeholder="• Action-led bullet with a measurable result" />
              <Textarea label="Education (optional)" value={draft.education} onChange={(e) => setDraft({ ...draft, education: e.target.value })} rows={2} />
              {draft.updatedAt > 0 && <p className="text-xs text-muted">Last saved {fmtDateTime(draft.updatedAt)}</p>}
            </div>
          </Card>
        </div>

        {/* AI panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="AI drafting" icon="sparkle" />
            <div className="space-y-4 p-5">
              {companies.length > 0 ? (
                <Select label="Tailor to target" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                  <option value="">General (no specific role)</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.roleTitle} · {c.company}</option>
                  ))}
                </Select>
              ) : (
                <p className="text-sm text-muted">Add a target company on the client's page to tailor the resume to a real posting.</p>
              )}

              <Button variant="accent" icon="sparkle" className="w-full" onClick={generate} disabled={busy || !hasInputs}>
                {busy ? "Drafting…" : draft.updatedAt > 0 ? "Re-draft with AI" : "Generate draft"}
              </Button>
              {!hasInputs && <p className="text-xs text-muted">Needs a CV, a completed interview, or a target company first.</p>}

              <div className="rounded-xl bg-paper-2 p-3 text-xs text-muted">
                <p className="font-semibold text-ink-700">Sources the AI uses</p>
                <ul className="mt-2 space-y-1.5">
                  <li className="flex items-center gap-2">
                    <Icon name={profile?.cvText ? "check" : "x"} size={13} className={profile?.cvText ? "text-sage-600" : "text-muted"} />
                    CV on file
                  </li>
                  <li className="flex items-center gap-2">
                    <Icon name={analysis ? "check" : "x"} size={13} className={analysis ? "text-sage-600" : "text-muted"} />
                    Interview analysis{analysis ? ` (${analysis.readinessScore}/100)` : ""}
                  </li>
                  <li className="flex items-center gap-2">
                    <Icon name={target ? "check" : "x"} size={13} className={target ? "text-sage-600" : "text-muted"} />
                    {target ? `${target.company} criteria` : "Target criteria"}
                  </li>
                </ul>
              </div>
            </div>
          </Card>

          {target?.aiSummary && (
            <Card>
              <CardHeader title="Keywords to include" />
              <div className="flex flex-wrap gap-1.5 p-5">
                {target.aiSummary.keywords.map((k) => (
                  <button
                    key={k}
                    onClick={() => {
                      const set = new Set(skillsText.split(",").map((s) => s.trim()).filter(Boolean));
                      set.add(k);
                      setSkillsText([...set].join(", "));
                    }}
                    className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-700 transition hover:border-steel-300 hover:bg-steel-50"
                  >
                    + {k}
                  </button>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <div className="flex items-center gap-3 p-5">
              <Avatar name={client.name} size={40} />
              <p className="text-sm text-muted">Resume is for the advisor to draft and share — clients see the tips on their results page.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
