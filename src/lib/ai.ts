import type {
  ChatMessage,
  ClientProfile,
  CompanySummary,
  InterviewAnalysis,
  Resume,
  TargetCompany,
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

/* -------- CV / Resume Analysis -------- */

export interface CvAnalysis {
  skills: string[];
  projects: string[];
  achievements: string[];
  experienceLevel: "Junior" | "Mid-level" | "Senior";
  personalizedQuestions: string[];
}

/**
 * Generates 5 interview questions tailored to the candidate's actual CV content.
 * References specific projects, skills, and achievements so questions feel personal.
 */
export function generatePersonalizedQuestions(
  profile: ClientProfile,
  target?: TargetCompany
): string[] {
  const cvText = profile.cvText ?? "";
  const cvSkills = [...new Set(words(cvText).filter((w) => SKILL_BANK.includes(w)))];
  const topSkills = cvSkills.slice(0, 3);

  const lines = cvText
    .split(/\n|\.(?=\s)/)
    .map((l) => l.trim().replace(/^[•\-*]\s*/, ""))
    .filter((l) => l.length > 20);

  const projectLines = lines.filter((l) =>
    /(built|developed|led|launched|shipped|created|designed|migrated|architected|reduced|increased|delivered)/i.test(l)
  );

  const role = target?.roleTitle ?? profile.headline ?? "this role";
  const company = target?.company;
  const targetSkills = target ? extractKeywords(target.jobDescription).slice(0, 3) : [];
  const skillFocus =
    targetSkills.length ? targetSkills.join(", ") : topSkills.join(", ") || "your core skills";

  const q2 =
    projectLines.length > 0
      ? (() => {
          const proj = projectLines[0].trim();
          const short = proj.length > 100 ? proj.slice(0, 97) + "…" : proj;
          return `Your CV mentions "${short}" — walk me through your specific contribution and what you'd do differently today.`;
        })()
      : `Tell me about a project or achievement you're most proud of${profile.yearsExperience > 0 ? ` from your ${profile.yearsExperience}-year career` : ""}. What was your specific role and the measurable outcome?`;

  return [
    company
      ? `Tell me about yourself and what makes you a strong fit for the ${role} role at ${company}.`
      : `Walk me through your background${topSkills.length ? ` — especially your experience with ${topSkills.slice(0, 2).join(" and ")}` : ""}.`,
    q2,
    `With ${skillFocus} being central to this position, describe a situation where you applied those skills under real pressure. What was the result?`,
    "Tell me about a time you had a significant disagreement with a teammate or on a technical direction. How did you handle it and what did you learn?",
    company
      ? `Why ${company} specifically, and where do you see yourself growing over the next two years?`
      : "Where do you feel your skills are strongest today, and what are you actively working to develop?",
  ];
}

/**
 * Analyses a candidate's CV text to extract structured insights.
 * Used to power the profile page's AI analysis panel.
 */
export function analyzeCv(profile: ClientProfile, target?: TargetCompany): CvAnalysis {
  const cvText = profile.cvText ?? "";
  const skills = [...new Set(words(cvText).filter((w) => SKILL_BANK.includes(w)))];

  const lines = cvText
    .split(/\n|\.(?=\s)/)
    .map((l) => l.trim().replace(/^[•\-*]\s*/, ""))
    .filter((l) => l.length > 20);

  const projects = lines
    .filter((l) =>
      /(built|developed|led|launched|shipped|created|designed|migrated|architected)/i.test(l)
    )
    .slice(0, 4);

  const achievements = lines
    .filter((l) =>
      /\d+%|\$\d|\b\d+\s?(users|customers|projects|hours|days|weeks|months|people|engineers|clients)\b/i.test(l)
    )
    .slice(0, 3);

  const yrs = profile.yearsExperience ?? 0;
  const experienceLevel: CvAnalysis["experienceLevel"] =
    yrs >= 6 ? "Senior" : yrs >= 3 ? "Mid-level" : "Junior";

  const personalizedQuestions = generatePersonalizedQuestions(profile, target);

  return { skills, projects, achievements, experienceLevel, personalizedQuestions };
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
