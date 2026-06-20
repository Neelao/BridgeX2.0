import { Interviews, Notes, Reminders, Sessions, Users } from "./db";
import { fmtDate, fmtDateTime } from "./format";
import { attentionItems, buildClientView, clientViews, rosterStats } from "./selectors";
import type {
  ChatMessage,
  ClientProfile,
  CompanySummary,
  InterviewAnalysis,
  Resume,
  TargetCompany,
  User,
} from "./types";

/**
 * Mock "AI engine". In a real build these calls would hit an LLM (e.g. the
 * Claude API). Here they use lightweight heuristics so the whole product is
 * demoable with zero backend / API keys. The shapes match what a real model
 * would return, so swapping in a live call later is a drop-in change.
 */

// Simulate network latency so the UI shows realistic "thinking" states.
export function aiDelay(ms = 850) {
  return new Promise((res) => setTimeout(res, ms));
}

function words(text: string): string[] {
  return (text.toLowerCase().match(/[a-z][a-z+#.]{2,}/g) ?? []).filter(
    (w) => !STOP.has(w)
  );
}

const STOP = new Set([
  "the","and","for","with","you","your","our","are","will","that","this","have",
  "from","into","they","their","them","has","was","were","who","what","how","why",
  "able","role","work","team","teams","years","year","experience","strong","good",
  "must","should","would","across","within","using","use","used","including","etc",
  "plus","preferred","required","requirements","responsibilities","candidate",
]);

const SKILL_BANK = [
  "react","typescript","javascript","python","java","node","sql","aws","azure","gcp",
  "docker","kubernetes","graphql","rest","api","figma","agile","scrum","leadership",
  "communication","stakeholder","analytics","tableau","excel","marketing","seo",
  "sales","finance","accounting","design","ux","product","data","machine","ml",
  "nlp","cloud","devops","ci","cd","testing","cybersecurity","security","golang",
  "rust","c++","swift","kotlin","mobile","android","ios","spring","django","flask",
];

/* -------- Mock interviewer: picks the next question -------- */
const QUESTION_FLOW = [
  "Thanks for joining. To start, tell me about yourself and what's drawing you to this role.",
  "Walk me through a project you're proud of. What was your specific contribution?",
  "Tell me about a time you faced a setback or conflict at work. How did you handle it?",
  "Where do you feel your skills are strongest, and where are you actively trying to grow?",
  "Why this company specifically, and where do you see yourself in a couple of years?",
];

export function nextInterviewerQuestion(candidateTurns: number): string {
  if (candidateTurns < QUESTION_FLOW.length) return QUESTION_FLOW[candidateTurns];
  return "That's helpful. Is there anything else you'd like the hiring team to know about you?";
}

/**
 * Builds a 5-question interview flow. When a target company is supplied, two
 * generic questions are swapped for role-tailored ones so the practice (and the
 * resulting analysis) maps to a real job the client is chasing.
 */
export function buildQuestionFlow(target?: TargetCompany): string[] {
  if (!target) return [...QUESTION_FLOW];
  const role = target.roleTitle;
  const company = target.company;
  const skills = extractKeywords(target.jobDescription).slice(0, 3);
  const skillLine = skills.length ? skills.join(", ") : "the core skills in the posting";
  return [
    `Thanks for joining. To start, tell me about yourself and why you're a fit for the ${role} role at ${company}.`,
    `This role leans on ${skillLine}. Walk me through a project where you used those, and your specific contribution.`,
    "Tell me about a time you faced a setback or conflict at work. How did you handle it?",
    `Where are your skills strongest for a ${role}, and where are you actively trying to grow?`,
    `Why ${company} specifically, and where do you see yourself in a couple of years?`,
  ];
}

export function isInterviewComplete(candidateTurns: number): boolean {
  return candidateTurns >= QUESTION_FLOW.length;
}

/* -------- Analyze a completed interview -------- */
export function analyzeInterview(
  messages: ChatMessage[],
  profile?: ClientProfile,
  target?: TargetCompany
): InterviewAnalysis {
  const answers = messages.filter((m) => m.role === "candidate");
  const allText = answers.map((a) => a.text).join(" ");
  const totalWords = allText.trim().split(/\s+/).filter(Boolean).length;
  const avgWords = answers.length ? Math.round(totalWords / answers.length) : 0;

  // Signal heuristics → readiness score.
  let score = 45;
  if (avgWords >= 25) score += 12;
  if (avgWords >= 50) score += 10;
  if (avgWords >= 90) score += 6;
  const usesExamples = /(for example|for instance|e\.g\.|such as|specifically|led|built|launched|increased|reduced|delivered|managed)/i.test(
    allText
  );
  if (usesExamples) score += 12;
  const usesMetrics = /\b\d+%|\$\d|\b\d+\s?(users|customers|people|projects|hours|days|weeks|months)\b/i.test(
    allText
  );
  if (usesMetrics) score += 10;

  const candidateSkills = new Set(words(allText).filter((w) => SKILL_BANK.includes(w)));
  const targetSkills = target ? extractKeywords(target.jobDescription) : [];
  const matched = targetSkills.filter((s) => candidateSkills.has(s.toLowerCase()));
  if (target && targetSkills.length) {
    score += Math.round((matched.length / targetSkills.length) * 12);
  }
  if (answers.length >= 5) score += 5;
  score = Math.max(20, Math.min(97, score));

  const strengths: string[] = [];
  if (avgWords >= 40) strengths.push("Answers are detailed and well-developed.");
  if (usesExamples) strengths.push("Backs up claims with concrete examples and ownership language.");
  if (usesMetrics) strengths.push("Quantifies impact with numbers and outcomes.");
  if (matched.length) strengths.push(`Mentions skills the target role asks for: ${matched.slice(0, 4).join(", ")}.`);
  if (answers.length >= 5) strengths.push("Stayed engaged across the full interview.");
  if (!strengths.length) strengths.push("Completed the interview and engaged with every question.");

  const gaps: string[] = [];
  if (avgWords < 25) gaps.push("Answers are short — coach toward fuller, STAR-style responses.");
  if (!usesExamples) gaps.push("Few concrete examples — needs to anchor stories in real situations.");
  if (!usesMetrics) gaps.push("Impact isn't quantified — add numbers (%, $, time saved, scale).");
  const missing = targetSkills.filter((s) => !candidateSkills.has(s.toLowerCase()));
  if (target && missing.length) gaps.push(`Didn't surface key role skills: ${missing.slice(0, 4).join(", ")}.`);
  if (!gaps.length) gaps.push("Polish delivery and tighten the closing 'why this company' answer.");

  const coachingActions: string[] = [
    avgWords < 25
      ? "Run a STAR-method drill before the next session."
      : "Do a timed mock focused on concise, structured storytelling.",
    !usesMetrics
      ? "Help the client add 3 quantified wins to their talking points."
      : "Help the client tailor metrics to the target role's priorities.",
    target
      ? `Align prep with ${target.company}'s posted requirements.`
      : "Add a target company so prep can be tailored to a real job description.",
  ];

  const resumeSuggestions: string[] = [
    "Lead bullets with action verbs + a measurable result.",
    usesMetrics
      ? "Mirror the quantified wins from the interview into the resume summary."
      : "Translate vague duties into quantified achievements.",
    matched.length
      ? `Feature these matched keywords prominently: ${matched.slice(0, 5).join(", ")}.`
      : "Weave the target role's keywords into the skills + experience sections.",
  ];

  const summary = buildSummary(score, avgWords, usesExamples, usesMetrics, matched, target, profile);

  return { readinessScore: score, summary, strengths, gaps, coachingActions, resumeSuggestions };
}

function buildSummary(
  score: number,
  avgWords: number,
  usesExamples: boolean,
  usesMetrics: boolean,
  matched: string[],
  target?: TargetCompany,
  profile?: ClientProfile
): string {
  const band = score >= 80 ? "interview-ready" : score >= 60 ? "nearly ready" : "needs focused coaching";
  const who = profile?.headline ? `The candidate (${profile.headline})` : "The candidate";
  const detail = avgWords >= 40 ? "gives detailed answers" : "tends to answer briefly";
  const ex = usesExamples ? "uses real examples" : "needs more concrete examples";
  const metric = usesMetrics ? "and quantifies impact well" : "and rarely quantifies impact";
  const fit = target
    ? matched.length
      ? ` For the ${target.roleTitle} role at ${target.company}, they already echo ${matched.length} of the posting's key skills.`
      : ` For the ${target.roleTitle} role at ${target.company}, they haven't yet surfaced the posting's key skills.`
    : "";
  return `${who} is ${band} (score ${score}/100). They ${detail}, ${ex} ${metric}.${fit} Prioritise the gaps below in the next session.`;
}

/* -------- Summarize a job description / company criteria -------- */
export function extractKeywords(jd: string): string[] {
  const counts = new Map<string, number>();
  for (const w of words(jd)) {
    if (SKILL_BANK.includes(w) || w.length >= 5) counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([w]) => w);
}

export function summarizeCompany(jd: string, roleTitle: string, company: string): CompanySummary {
  const lines = jd
    .split(/\n|•|-|•|;|\.(?=\s)/)
    .map((l) => l.trim())
    .filter((l) => l.length > 12);

  const mustHaves: string[] = [];
  const niceToHaves: string[] = [];
  for (const l of lines) {
    const low = l.toLowerCase();
    if (/(nice to have|preferred|bonus|plus|a plus|ideally)/.test(low)) {
      niceToHaves.push(clean(l));
    } else if (/(require|must|need|responsib|experience|proficien|strong|expect|own|lead|build|manage)/.test(low)) {
      mustHaves.push(clean(l));
    }
  }
  // Fallbacks so the summary is never empty.
  if (!mustHaves.length) mustHaves.push(...lines.slice(0, 4).map(clean));
  if (!niceToHaves.length && lines.length > 4) niceToHaves.push(...lines.slice(4, 6).map(clean));

  const keywords = extractKeywords(jd);
  const resumeTips = [
    `Add a one-line summary positioning the client for the ${roleTitle} role at ${company}.`,
    keywords.length
      ? `Surface these keywords in skills/experience: ${keywords.slice(0, 6).join(", ")}.`
      : "Mirror the exact phrasing of the posting in the skills section.",
    "Reorder experience bullets so the most relevant achievements appear first.",
    "Quantify each relevant bullet with a metric the hiring manager would care about.",
  ];

  const fitNote = `Tailor prep and resume to the ${mustHaves.length} core requirements below. Closing the gaps on these will move the readiness score the most.`;

  return {
    mustHaves: mustHaves.slice(0, 6),
    niceToHaves: niceToHaves.slice(0, 4),
    keywords,
    resumeTips,
    fitNote,
  };
}

function clean(s: string): string {
  const t = s.replace(/\s+/g, " ").trim().replace(/[:•\-]+$/, "");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/* -------- Morning briefing across all clients -------- */
export interface BriefingItem {
  clientName: string;
  clientId: string;
  line: string;
  tone: "good" | "warn" | "info";
}

/* -------- Draft a tailored resume from CV + interview + target criteria -------- */
export function generateResume(
  profile?: ClientProfile,
  analysis?: InterviewAnalysis,
  target?: TargetCompany
): Omit<Resume, "clientId" | "updatedAt"> {
  const role = target?.roleTitle ?? profile?.headline ?? "the target role";
  const company = target?.company;
  const keywords = target?.aiSummary?.keywords ?? (target ? extractKeywords(target.jobDescription) : []);
  const cvSkills = profile ? Array.from(new Set(words(profile.cvText).filter((w) => SKILL_BANK.includes(w)))) : [];
  const skills = Array.from(new Set([...keywords, ...cvSkills])).slice(0, 12);

  const years = profile?.yearsExperience ? `${profile.yearsExperience}+ years` : "proven";
  const summary =
    `${role} with ${years} of experience` +
    (company ? `, targeting the ${role} role at ${company}.` : ".") +
    (skills.length ? ` Strengths across ${skills.slice(0, 4).join(", ")}.` : "") +
    (analysis?.readinessScore != null
      ? ` Interview readiness assessed at ${analysis.readinessScore}/100.`
      : "");

  // Turn raw CV lines into action-led bullets; fall back to coached suggestions.
  const cvLines = (profile?.cvText ?? "")
    .split(/\n|\.(?=\s)/)
    .map((l) => l.trim())
    .filter((l) => l.length > 20)
    .slice(0, 4);
  const bullets =
    cvLines.length > 0
      ? cvLines.map((l) => `• ${toActionBullet(l)}`)
      : (analysis?.resumeSuggestions ?? [
          "Led a key project end to end, delivering measurable impact.",
          "Collaborated cross-functionally to ship on time.",
        ]).map((s) => `• ${s}`);

  return {
    headline: profile?.headline || role,
    summary,
    skills,
    experience: bullets.join("\n"),
    education: "",
    generatedFromCompanyId: target?.id,
  };
}

function toActionBullet(line: string): string {
  const t = line.replace(/\s+/g, " ").trim().replace(/^[•\-*]\s*/, "");
  const hasMetric = /\d/.test(t);
  const capped = t.charAt(0).toUpperCase() + t.slice(1);
  return hasMetric ? capped : `${capped} (add a metric: %, $, time, or scale).`;
}

/* -------- Advisor assistant: answers free-form questions about the roster -------- */
export const ADVISOR_PROMPT_SUGGESTIONS = [
  "Who needs my attention today?",
  "Summarize my roster",
  "What should I focus on this week?",
  "Any overdue follow-ups?",
  "Who's closest to being interview-ready?",
];

// Readiness score at/above this is considered "interview-ready" — matches the
// threshold already used for the Dashboard's "Interview-ready" stat and ScoreBadge bands.
const READY_THRESHOLD = 80;

export function answerAdvisorQuery(advisorId: string, question: string): string {
  const q = question.toLowerCase().trim();
  const clients = Users.clientsOf(advisorId);

  if (/^(hi|hey|hello|yo)\b/.test(q)) {
    return "Hey, I'm Bridgy! Ask me about a specific client, your roster's overall readiness, who needs attention, or what to prep for upcoming sessions.";
  }

  const mentioned = clients.find((c) => {
    const first = c.name.split(" ")[0].toLowerCase();
    return q.includes(c.name.toLowerCase()) || (first.length > 2 && q.includes(first));
  });
  const asksPrediction = /(when (will|is)|how long|how many (more )?sessions?|ready by|progress|predict|trend|on track)/.test(q);
  if (mentioned && asksPrediction) return readinessPredictionLine(mentioned);
  if (mentioned) return clientBriefing(mentioned);

  if (/(closest|soonest|who.*ready first)/.test(q)) return soonestToReadyBriefing(advisorId);
  if (/(overdue|follow.?up|reminder)/.test(q)) return overdueBriefing(advisorId);
  if (/(today|this week|agenda|upcoming|session|schedule)/.test(q)) return scheduleBriefing(advisorId);
  if (/(attention|priorit|risk|who needs|falling behind)/.test(q)) return attentionBriefing(advisorId);
  if (/(suggest|advice|recommend|what should i do|focus on|\baction)/.test(q)) return actionBriefing(advisorId);
  if (/(overview|roster|stats|how (is|are) my|book of business|performance)/.test(q)) return rosterBriefing(advisorId);

  if (!clients.length) {
    return "You don't have any clients yet. Add one from the Clients page and I can start tracking their readiness and next steps.";
  }

  return (
    `I can pull up anything about your ${clients.length} client${clients.length === 1 ? "" : "s"} — try naming one ` +
    `(e.g. "How is ${clients[0].name.split(" ")[0]} doing?"), or ask about who needs attention, your roster stats, ` +
    `upcoming sessions, or overdue follow-ups.`
  );
}

function clientBriefing(client: User): string {
  const view = buildClientView(client);
  const notes = Notes.forClient(client.id);
  const parts: string[] = [];
  parts.push(
    typeof view.readiness === "number"
      ? `${client.name} has an interview readiness score of ${view.readiness}/100 across ${view.interviewCount} completed mock interview${view.interviewCount === 1 ? "" : "s"}.`
      : `${client.name} hasn't completed a mock interview yet.`
  );
  if (view.targetCompany) parts.push(`Targeting: ${view.targetCompany}.`);
  if (view.latestInterview?.analysis?.gaps.length) {
    parts.push(`Top gap to coach: ${view.latestInterview.analysis.gaps[0]}`);
  }
  if (view.nextSessionAt) parts.push(`Next session ${fmtDateTime(view.nextSessionAt)}.`);
  if (view.daysSinceContact != null) {
    parts.push(`Last contact ${view.daysSinceContact} day${view.daysSinceContact === 1 ? "" : "s"} ago.`);
  }
  if (notes[0]) parts.push(`Latest note: "${notes[0].text}"`);
  return parts.join(" ");
}

function attentionBriefing(advisorId: string): string {
  const items = attentionItems(advisorId);
  if (!items.length) return "Nothing urgent right now — your roster is in good shape.";
  const top = items.slice(0, 5).map((i) => `• ${i.clientName}: ${i.text}`).join("\n");
  return `${items.length} item${items.length === 1 ? "" : "s"} need your attention:\n${top}`;
}

function scheduleBriefing(advisorId: string): string {
  const now = Date.now();
  const upcoming = Sessions.forAdvisor(advisorId).filter((s) => s.status === "scheduled" && s.when > now);
  if (!upcoming.length) return "No sessions scheduled. Head to the Schedule page to book one.";
  const lines = upcoming.slice(0, 5).map((s) => {
    const c = Users.byId(s.clientId);
    return `• ${fmtDateTime(s.when)} — ${c?.name ?? "Client"}: ${s.topic}`;
  });
  return `Upcoming sessions:\n${lines.join("\n")}`;
}

function overdueBriefing(advisorId: string): string {
  const now = Date.now();
  const overdue = Reminders.forAdvisor(advisorId).filter((r) => !r.done && r.dueAt < now);
  if (!overdue.length) return "No overdue follow-ups — you're caught up.";
  const lines = overdue.slice(0, 5).map((r) => {
    const c = Users.byId(r.clientId);
    return `• ${c?.name ?? "Client"}: ${r.text} (due ${fmtDate(r.dueAt)})`;
  });
  return `${overdue.length} overdue follow-up${overdue.length === 1 ? "" : "s"}:\n${lines.join("\n")}`;
}

function actionBriefing(advisorId: string): string {
  const views = clientViews(advisorId);
  const items = attentionItems(advisorId);
  if (!views.length) return "Add a client to get tailored suggestions.";
  const lines: string[] = [];
  if (items.length) lines.push(`Start with: ${items[0].text} (${items[0].clientName}).`);
  const lowest = views.filter((v) => typeof v.readiness === "number").sort((a, b) => (a.readiness ?? 0) - (b.readiness ?? 0))[0];
  if (lowest && (lowest.readiness ?? 100) < 70) {
    lines.push(`${lowest.user.name} has the lowest readiness score (${lowest.readiness}/100) — a coaching session would help most.`);
  }
  const noInterview = views.filter((v) => v.interviewCount === 0);
  if (noInterview.length) {
    lines.push(`${noInterview.length} client${noInterview.length === 1 ? "" : "s"} haven't done a mock interview yet — nudge them to start.`);
  }
  if (!lines.length) lines.push("Your roster looks solid — no urgent actions right now.");
  return lines.join(" ");
}

interface ReadinessProjection {
  trend: "improving" | "declining" | "flat" | "ready" | "insufficient-data";
  latestScore: number | null;
  slopePerSession: number | null;
  sessionsToReady: number | null;
  estimatedDate: number | null;
}

/**
 * Projects when a client will cross READY_THRESHOLD by fitting a straight
 * line through their completed-interview scores over time. Needs at least
 * two scored interviews — one point has no slope to extrapolate from.
 */
function predictReadiness(clientId: string): ReadinessProjection {
  const history = Interviews.forClient(clientId)
    .filter((i) => i.completedAt && i.analysis)
    .sort((a, b) => a.completedAt! - b.completedAt!);

  if (!history.length) {
    return { trend: "insufficient-data", latestScore: null, slopePerSession: null, sessionsToReady: null, estimatedDate: null };
  }

  const latest = history[history.length - 1].analysis!.readinessScore;
  if (latest >= READY_THRESHOLD) {
    return { trend: "ready", latestScore: latest, slopePerSession: null, sessionsToReady: 0, estimatedDate: history[history.length - 1].completedAt! };
  }
  if (history.length === 1) {
    return { trend: "insufficient-data", latestScore: latest, slopePerSession: null, sessionsToReady: null, estimatedDate: null };
  }

  const first = history[0].analysis!.readinessScore;
  const span = history.length - 1;
  const slope = (latest - first) / span;
  const avgGapMs = (history[history.length - 1].completedAt! - history[0].completedAt!) / span;

  if (slope <= 0) {
    return { trend: slope < 0 ? "declining" : "flat", latestScore: latest, slopePerSession: slope, sessionsToReady: null, estimatedDate: null };
  }
  const sessionsToReady = Math.ceil((READY_THRESHOLD - latest) / slope);
  const estimatedDate = Date.now() + sessionsToReady * avgGapMs;
  return { trend: "improving", latestScore: latest, slopePerSession: slope, sessionsToReady, estimatedDate };
}

function readinessPredictionLine(client: User): string {
  const p = predictReadiness(client.id);
  switch (p.trend) {
    case "insufficient-data":
      return p.latestScore == null
        ? `${client.name} hasn't completed a mock interview yet — no readiness data to project from.`
        : `${client.name} has only one scored interview (${p.latestScore}/100) — need at least one more to project a trend.`;
    case "ready":
      return `${client.name} is already interview-ready (${p.latestScore}/100).`;
    case "declining":
      return `${client.name}'s readiness is trending down (now ${p.latestScore}/100, ${p.slopePerSession!.toFixed(1)} pts/session) — needs a change in coaching approach, not just more reps.`;
    case "flat":
      return `${client.name}'s readiness has plateaued at ${p.latestScore}/100 across recent sessions — try a different coaching angle before the next one.`;
    case "improving": {
      const sessionsTxt = `${p.sessionsToReady} more session${p.sessionsToReady === 1 ? "" : "s"}`;
      const dateTxt = p.estimatedDate ? ` (around ${fmtDate(p.estimatedDate)} at the current pace)` : "";
      return `${client.name} is trending up (${p.slopePerSession!.toFixed(1)} pts/session, now ${p.latestScore}/100) — projected interview-ready in ${sessionsTxt}${dateTxt}.`;
    }
  }
}

function soonestToReadyBriefing(advisorId: string): string {
  const projections = Users.clientsOf(advisorId)
    .map((client) => ({ client, p: predictReadiness(client.id) }))
    .filter((x) => x.p.trend === "improving" && x.p.sessionsToReady != null)
    .sort((a, b) => (a.p.sessionsToReady ?? 99) - (b.p.sessionsToReady ?? 99));

  if (!projections.length) {
    return "No clients currently have a clear improving trend to project from — log more completed mock interviews to enable predictions.";
  }
  const lines = projections
    .slice(0, 5)
    .map(
      ({ client, p }) =>
        `• ${client.name}: ready in ~${p.sessionsToReady} session${p.sessionsToReady === 1 ? "" : "s"}${p.estimatedDate ? ` (around ${fmtDate(p.estimatedDate)})` : ""}`
    );
  return `Closest to interview-ready:\n${lines.join("\n")}`;
}

function rosterBriefing(advisorId: string): string {
  const stats = rosterStats(advisorId);
  return (
    `You have ${stats.total} client${stats.total === 1 ? "" : "s"}. ` +
    `${stats.ready} are interview-ready, ${stats.needsWork} need work` +
    (stats.avgReadiness != null ? `, average readiness is ${stats.avgReadiness}/100.` : ".") +
    ` ${stats.openReminders} open reminder${stats.openReminders === 1 ? "" : "s"} and ${stats.upcomingSessions} upcoming session${stats.upcomingSessions === 1 ? "" : "s"}.`
  );
}
