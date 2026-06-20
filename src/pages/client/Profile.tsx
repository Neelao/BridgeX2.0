import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { Companies, Interviews, Profiles } from "../../lib/db";
import { useStore } from "../../lib/useStore";
import { fmtDateTime } from "../../lib/format";
import { analyzeCv } from "../../lib/ai";
import type { ClientProfile } from "../../lib/types";
import { useToast } from "../../components/Toast";
import { PageHeader } from "../../components/Shell";
import {
  AiBadge,
  Button,
  Card,
  CardHeader,
  Icon,
  Input,
  Meter,
  Pill,
  Textarea,
} from "../../components/ui";

const SKILL_CATEGORIES: Record<string, string[]> = {
  Frontend: ["react", "typescript", "javascript", "html", "css", "vue", "angular", "figma", "ux", "accessibility"],
  Backend: ["node", "python", "java", "sql", "graphql", "rest", "api", "django", "flask", "spring"],
  Tools: ["docker", "kubernetes", "aws", "azure", "gcp", "git", "testing", "devops", "agile", "scrum", "ci", "cd"],
  "Soft Skills": ["communication", "leadership", "stakeholder", "management", "collaboration"],
};

function profileCompletion(p: ClientProfile): number {
  let pct = 0;
  if (p.headline?.trim()) pct += 15;
  if (p.location?.trim()) pct += 10;
  if (p.phone?.trim()) pct += 5;
  if (p.yearsExperience > 0) pct += 10;
  if (p.cvText?.trim()) pct += 50;
  if (p.portfolioUrl?.trim()) pct += 10;
  return pct;
}

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
      portfolioUrl: "",
      updatedAt: 0,
    }
  );
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const latest = useStore(() => Interviews.latestComplete(clientId), [clientId]);
  const companies = useStore(() => Companies.forClient(clientId), [clientId]);

  const analysis = latest?.analysis;
  const company = companies[0];

  // Live CV analysis — updates as the user edits the CV text
  const cvAnalysis = form.cvText.trim() ? analyzeCv(form, company) : null;

  // Skill detection grouped by category
  const detectedSkills: Record<string, string[]> = {};
  if (cvAnalysis) {
    for (const [cat, skills] of Object.entries(SKILL_CATEGORIES)) {
      const found = skills.filter((s) => cvAnalysis.skills.includes(s));
      if (found.length) detectedSkills[cat] = found;
    }
  }

  // Role matching
  const keywords = company?.aiSummary?.keywords ?? [];
  const cvLower = form.cvText.toLowerCase();
  const matchedSkills = keywords.filter((k) => cvLower.includes(k.toLowerCase()));
  const missingSkills = keywords.filter((k) => !cvLower.includes(k.toLowerCase()));
  const matchPct = keywords.length ? Math.round((matchedSkills.length / keywords.length) * 100) : 0;

  const score = analysis?.readinessScore;
  const projectedScore = typeof score === "number" ? Math.min(99, score + 6) : null;
  const completionPct = profileCompletion(form);

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
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Career profile"
        title="My Profile"
        subtitle="Keep this current — your advisor and the AI use it to tailor your prep."
      />

      {/* Professional Summary */}
      <Card className="mb-6">
        <div className="p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#44415f] to-[#2c2a40] text-2xl font-bold text-white">
              {user!.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-ink-900">{user!.name}</h2>
                  <p className="text-sm text-muted">
                    {form.headline || "Add your headline"}
                    {form.location ? ` · ${form.location}` : ""}
                    {form.yearsExperience > 0 ? ` · ${form.yearsExperience} yrs exp` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {typeof score === "number" && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-sage-200 bg-sage-50 px-3 py-1 text-xs font-semibold text-sage-700">
                      <Icon name="chart" size={12} />
                      {score}/100 Readiness
                    </span>
                  )}
                  {matchPct > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-steel-200 bg-steel-50 px-3 py-1 text-xs font-semibold text-steel-700">
                      <Icon name="target" size={12} />
                      {matchPct}% Role Match
                    </span>
                  )}
                  {cvAnalysis && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper-2 px-3 py-1 text-xs font-semibold text-ink-600">
                      {cvAnalysis.experienceLevel} Level
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-xs text-muted">Profile completion</p>
                  <p className="text-xs font-bold text-ink-800">{completionPct}%</p>
                </div>
                <Meter
                  value={completionPct}
                  tone={completionPct >= 80 ? "sage" : completionPct >= 50 ? "steel" : "gold"}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      <form onSubmit={save}>
        <div className="grid gap-6 md:grid-cols-3">
          {/* Left: Form Sections */}
          <div className="space-y-6 md:col-span-2">
            {/* Personal Info */}
            <Card>
              <CardHeader title="Personal Info" icon="users" />
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <Input
                  label="Headline"
                  value={form.headline}
                  onChange={(e) => update("headline", e.target.value)}
                  placeholder="Frontend Engineer, 4 yrs"
                />
                <Input
                  label="Location"
                  value={form.location}
                  onChange={(e) => update("location", e.target.value)}
                  placeholder="Manchester, UK"
                />
                <Input
                  label="Phone"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="+44 …"
                />
                <Input
                  label="Years of experience"
                  type="number"
                  min={0}
                  value={form.yearsExperience}
                  onChange={(e) => update("yearsExperience", Number(e.target.value))}
                />
                <div className="sm:col-span-2">
                  <Input
                    label="Portfolio / GitHub URL"
                    value={form.portfolioUrl ?? ""}
                    onChange={(e) => update("portfolioUrl", e.target.value)}
                    placeholder="https://github.com/you  or  https://yourportfolio.com"
                    hint="Share your work — the AI uses this to generate more relevant interview questions."
                  />
                </div>
              </div>
            </Card>

            {/* Resume & CV Upload */}
            <Card>
              <CardHeader
                title="Resume & CV"
                icon="file"
                action={form.cvFileName ? <Pill tone="sage">{form.cvFileName}</Pill> : undefined}
              />
              <div className="space-y-4 p-4">
                {/* Upload zone */}
                <div
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-line-strong bg-paper px-4 py-5 text-center transition hover:border-steel-400 hover:bg-steel-50/30 cursor-pointer"
                  onClick={() => fileRef.current?.click()}
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-steel-50 text-steel-500 mb-3">
                    <Icon name="download" size={22} strokeWidth={1.5} />
                  </span>
                  <p className="text-sm font-medium text-ink-800">Upload your resume</p>
                  <p className="mt-1 text-xs text-muted">
                    .txt and .md files are read automatically · PDF/DOCX stored by name
                  </p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".txt,.md,.pdf,.doc,.docx"
                    onChange={onFile}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
                  >
                    Choose file
                  </Button>
                </div>

                {/* CV Analysis Panel — shown when cvText is present */}
                {cvAnalysis && (
                  <div className="rounded-xl border border-line bg-paper-2 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3">
                      <Icon name="sparkle" size={14} className="text-steel-500" />
                      <p className="text-[13px] font-semibold text-ink-900">AI Resume Analysis</p>
                      <AiBadge />
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-4">
                      {[
                        { label: "Skills Detected", value: cvAnalysis.skills.length },
                        { label: "Projects Found", value: cvAnalysis.projects.length },
                        { label: "Key Achievements", value: cvAnalysis.achievements.length },
                        { label: "Role Match", value: matchPct > 0 ? `${matchPct}%` : "—" },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-lg border border-line bg-surface px-3 py-3 text-center">
                          <p className="text-xl font-bold text-ink-900">{value}</p>
                          <p className="text-[11px] text-muted">{label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Projects */}
                    {cvAnalysis.projects.length > 0 && (
                      <div className="px-4 py-3">
                        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-muted">
                          Projects & Experience Detected
                        </p>
                        <div className="space-y-1.5">
                          {cvAnalysis.projects.map((p, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm">
                              <Icon name="chevronRight" size={13} className="mt-0.5 shrink-0 text-steel-400" />
                              <span className="text-ink-700 leading-snug">{p}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Achievements */}
                    {cvAnalysis.achievements.length > 0 && (
                      <div className="px-4 py-3">
                        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-muted">
                          Quantified Achievements
                        </p>
                        <div className="space-y-1.5">
                          {cvAnalysis.achievements.map((a, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm">
                              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-sage-100 text-sage-600">
                                <Icon name="check" size={10} strokeWidth={2.5} />
                              </span>
                              <span className="text-ink-700 leading-snug">{a}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* CV text editor */}
                <Textarea
                  label="CV content"
                  value={form.cvText}
                  onChange={(e) => update("cvText", e.target.value)}
                  rows={5}
                  placeholder="Paste your CV text here. The AI uses this to generate personalized interview questions, analyse your skill gaps, and tailor resume tips."
                  hint="Tip: paste plain text from your resume so the AI can match it against target roles and craft relevant questions."
                />
              </div>
            </Card>
          </div>

          {/* Right: AI Panels */}
          <div className="space-y-6">
            {/* AI Career Analysis */}
            {analysis && (
              <Card>
                <CardHeader title="AI Career Analysis" icon="sparkle" action={<AiBadge />} />
                <div className="space-y-4 p-5">
                  <div>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-sage-600">
                      Top Strengths
                    </p>
                    <div className="space-y-1.5">
                      {analysis.strengths.slice(0, 3).map((s, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-sage-100 text-sage-600">
                            <Icon name="check" size={10} strokeWidth={2.5} />
                          </span>
                          <span className="leading-snug text-ink-700">{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {missingSkills.length > 0 && (
                    <div>
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-clay-500">
                        Needs Improvement
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {missingSkills.slice(0, 5).map((skill) => (
                          <span
                            key={skill}
                            className="rounded-full border border-clay-100 bg-clay-50 px-2.5 py-0.5 text-xs font-medium capitalize text-clay-600"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {projectedScore !== null && missingSkills.length > 0 && (
                    <p className="rounded-lg border border-steel-100 bg-steel-50 px-3 py-2.5 text-xs text-steel-700">
                      Improving <strong>{missingSkills[0]}</strong>
                      {missingSkills[1] ? <> and <strong>{missingSkills[1]}</strong></> : ""} could
                      increase your role match by ~{Math.min(15, missingSkills.length * 4)}%.
                    </p>
                  )}
                </div>
              </Card>
            )}

            {/* Detected Skills */}
            {Object.keys(detectedSkills).length > 0 && (
              <Card>
                <CardHeader title="Detected Skills" icon="sparkle" />
                <div className="space-y-4 p-5">
                  {Object.entries(detectedSkills).map(([cat, skills]) => (
                    <div key={cat}>
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-muted">
                        {cat}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {skills.map((skill) => (
                          <span
                            key={skill}
                            className="rounded-full border border-steel-100 bg-steel-50 px-2.5 py-0.5 text-xs font-medium capitalize text-steel-700"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Target Roles with match % */}
            {companies.length > 0 && (
              <Card>
                <CardHeader title="Target Roles" icon="briefcase" />
                <div className="p-5">
                  <div className="space-y-4">
                    {companies.map((c) => {
                      const kws = c.aiSummary?.keywords ?? [];
                      const cMatchedCount = kws.filter((k) => cvLower.includes(k)).length;
                      const cMatchPct = kws.length
                        ? Math.round((cMatchedCount / kws.length) * 100)
                        : 0;
                      const cMissing = kws.filter((k) => !cvLower.includes(k)).slice(0, 3);
                      return (
                        <div key={c.id} className="rounded-xl border border-line p-4">
                          <div className="mb-3 flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-ink-800">{c.roleTitle}</p>
                              <p className="text-xs text-muted">{c.company}</p>
                            </div>
                            {kws.length > 0 && (
                              <div className="text-right">
                                <p className="text-2xl font-bold tnum leading-none text-ink-900">
                                  {cMatchPct}%
                                </p>
                                <p className="text-[10px] text-muted">match</p>
                              </div>
                            )}
                          </div>
                          {kws.length > 0 && (
                            <>
                              <Meter
                                value={cMatchPct}
                                tone={cMatchPct >= 80 ? "sage" : cMatchPct >= 60 ? "steel" : "gold"}
                              />
                              {cMissing.length > 0 && (
                                <div className="mt-2.5 flex flex-wrap gap-1.5">
                                  <span className="text-[11px] font-semibold text-clay-500">
                                    Missing:
                                  </span>
                                  {cMissing.map((s) => (
                                    <span
                                      key={s}
                                      className="rounded-full bg-clay-50 px-2 py-0.5 text-[11px] font-medium capitalize text-clay-600"
                                    >
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <Link to="/client/interview">
                                <Button size="sm" variant="outline" className="mt-3 w-full justify-center">
                                  Improve Match Score
                                </Button>
                              </Link>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Sticky Save Bar */}
        <div className="sticky bottom-0 z-10 mt-6 -mx-4 border-t border-line bg-surface/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
          <div className="mx-auto flex max-w-5xl items-center gap-3">
            <Button type="submit" icon="check">
              Save Profile
            </Button>
            {saved && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-sage-600">
                <Icon name="check" size={15} strokeWidth={2.2} />
                Saved
              </span>
            )}
            {existing?.updatedAt ? (
              <span className="text-xs text-muted">
                Last updated {fmtDateTime(existing.updatedAt)}
              </span>
            ) : null}
            <div className="ml-auto">
              <Link to="/client/results">
                <Button type="button" variant="outline" icon="chart">
                  View Recommendations
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
