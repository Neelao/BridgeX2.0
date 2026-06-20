import { analyzeInterview, summarizeCompany } from "./ai";
import {
  Companies,
  Interviews,
  Messages,
  Notes,
  Opportunities,
  Profiles,
  Referrals,
  Reminders,
  Sessions,
  Users,
  KEYS,
  uid,
} from "./db";
import type { ChatMessage, Interview, Opportunity, TargetCompany, User } from "./types";

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

/** Seed a realistic demo dataset the first time the app runs in a browser. */
export function ensureSeeded() {
  if (localStorage.getItem(KEYS.seeded)) return;

  // Start from a clean slate so re-seeding a newer demo version can't duplicate
  // data left by an older one.
  [
    KEYS.users, KEYS.profiles, KEYS.companies, KEYS.interviews, KEYS.sessions,
    KEYS.reminders, KEYS.notes, KEYS.resumes, KEYS.opportunities, KEYS.referrals,
    KEYS.currentUser,
  ].forEach((k) => localStorage.removeItem(k));

  const now = Date.now();

  const advisor: User = {
    id: "adv_demo",
    role: "advisor",
    email: "advisor@bridgex.io",
    password: "advisor123",
    name: "Dana Okafor",
    title: "Senior Career Advisor",
    agency: "BridgeX Careers",
    createdAt: now - 30 * DAY,
  };

  const clientsSeed: Array<{
    id: string;
    name: string;
    email: string;
    targetRole: string;
    headline: string;
    location: string;
    years: number;
    cv: string;
    company: string;
    jd: string;
    answers: string[];
  }> = [
    {
      id: "cli_amir",
      name: "Amir Rahman",
      email: "amir@demo.io",
      targetRole: "Frontend Engineer",
      headline: "Frontend Engineer, 4 yrs",
      location: "Manchester, UK",
      years: 4,
      cv: "Frontend Engineer with 4 years building React and TypeScript apps. Shipped a customer dashboard used by 12,000 users, reduced page load time by 35%. Skilled in React, TypeScript, REST APIs, testing and CI/CD. Led migration of a legacy jQuery app to React.",
      company: "Monzo",
      jd: "We are looking for a Frontend Engineer with strong React and TypeScript experience. You must have experience building accessible, responsive web apps and working with REST APIs. Responsibilities include owning features end to end and collaborating with design. Experience with testing and CI/CD required. GraphQL is a plus. Nice to have: design systems experience.",
      answers: [
        "I'm a frontend engineer with four years of experience, mostly in React and TypeScript. I'm drawn to this role because I led a dashboard rebuild that increased engagement and I want to do that kind of high-impact product work at a fintech like yours.",
        "I'm most proud of migrating a legacy jQuery app to React. I owned the architecture, set up CI/CD, and we reduced page load time by 35% and cut bug reports in half over three months.",
        "We had a conflict over a deadline once. A teammate and I disagreed on scope, so I proposed splitting the feature into a smaller release. We shipped on time and revisited the rest next sprint.",
        "My strongest skills are React, TypeScript and performance optimization. I'm actively improving my accessibility knowledge and learning GraphQL right now.",
        "I want to join Monzo because I admire the product and the engineering culture. In two years I'd like to be a senior engineer mentoring others and owning a product area.",
      ],
    },
    {
      id: "cli_lena",
      name: "Lena Petrov",
      email: "lena@demo.io",
      targetRole: "Product Marketing Manager",
      headline: "Marketing specialist, 6 yrs",
      location: "Berlin, DE",
      years: 6,
      cv: "Marketing specialist with 6 years across SEO, content and analytics. Grew organic traffic 120% in one year. Experience with campaign analytics and stakeholder communication.",
      company: "Spotify",
      jd: "Seeking a Product Marketing Manager. Required: strong communication, go-to-market strategy, analytics, and stakeholder management. Must own positioning and messaging. Experience with SEO and content marketing preferred. Nice to have: experience in a subscription business.",
      answers: [
        "I work in marketing.",
        "I ran some campaigns and they did well.",
        "There was a disagreement but we sorted it out eventually.",
        "I think I'm good at content. Maybe analytics is something to work on.",
        "I like Spotify and want to grow here.",
      ],
    },
    {
      id: "cli_sam",
      name: "Samuel Adeyemi",
      email: "sam@demo.io",
      targetRole: "Data Analyst",
      headline: "Junior Data Analyst, 2 yrs",
      location: "Lagos, NG",
      years: 2,
      cv: "Junior Data Analyst with 2 years experience in SQL, Python and Tableau. Built dashboards that informed weekly decisions for a 30-person sales team.",
      company: "Andela",
      jd: "Data Analyst needed with SQL and Python skills. Must be able to build dashboards (Tableau or similar) and communicate insights to stakeholders. Statistics knowledge required. Nice to have: experience with machine learning.",
      answers: [
        "I'm a junior data analyst with two years of experience. I use SQL, Python and Tableau daily and I'm excited about a role where data directly drives decisions.",
        "I built a sales dashboard in Tableau that the team checks every Monday. It helped surface a churn pattern and the team adjusted, recovering about 15 customers.",
        "Early on I shipped a report with a bug. I owned it, fixed the query, and added a validation check so it wouldn't happen again.",
        "SQL and dashboarding are my strengths. I'm learning statistics and starting on machine learning basics now.",
        "Andela's mission resonates with me. In two years I want to be a strong mid-level analyst comfortable with predictive models.",
      ],
    },
  ];

  const users: User[] = [advisor];

  for (const c of clientsSeed) {
    users.push({
      id: c.id,
      role: "client",
      email: c.email,
      password: "client123",
      name: c.name,
      advisorId: advisor.id,
      targetRole: c.targetRole,
      createdAt: now - 10 * DAY,
    });

    Profiles.upsert({
      clientId: c.id,
      headline: c.headline,
      location: c.location,
      phone: "",
      yearsExperience: c.years,
      cvText: c.cv,
      cvFileName: `${c.name.split(" ")[0]}_CV.pdf`,
      updatedAt: now - 5 * DAY,
    });

    const company: TargetCompany = {
      id: uid("co"),
      clientId: c.id,
      company: c.company,
      roleTitle: c.targetRole,
      jobDescription: c.jd,
      createdAt: now - 4 * DAY,
    };
    company.aiSummary = summarizeCompany(c.jd, c.targetRole, c.company);
    Companies.upsert(company);

    // Build a completed interview from the canned answers.
    const messages: ChatMessage[] = [];
    const questions = [
      "Thanks for joining. Tell me about yourself and what's drawing you to this role.",
      "Walk me through a project you're proud of. What was your specific contribution?",
      "Tell me about a time you faced a setback or conflict at work. How did you handle it?",
      "Where do you feel your skills are strongest, and where are you actively trying to grow?",
      "Why this company specifically, and where do you see yourself in a couple of years?",
    ];
    let t = now - 3 * DAY;
    c.answers.forEach((ans, i) => {
      messages.push({ id: uid("m"), role: "interviewer", text: questions[i], at: t });
      t += 60 * 1000;
      messages.push({ id: uid("m"), role: "candidate", text: ans, at: t });
      t += 90 * 1000;
    });

    const profile = Profiles.forClient(c.id);
    const interview: Interview = {
      id: uid("iv"),
      clientId: c.id,
      targetCompanyId: company.id,
      startedAt: now - 3 * DAY,
      completedAt: now - 3 * DAY + 10 * 60 * 1000,
      messages,
    };
    interview.analysis = analyzeInterview(messages, profile, company);
    Interviews.upsert(interview);
  }

  Users.save(users);

  // A couple of scheduled sessions.
  Sessions.upsert({
    id: uid("ses"),
    advisorId: advisor.id,
    clientId: "cli_amir",
    when: now + 1 * DAY + 3 * HOUR,
    durationMins: 45,
    topic: "Mock interview review + resume tailoring for Monzo",
    status: "scheduled",
  });
  Sessions.upsert({
    id: uid("ses"),
    advisorId: advisor.id,
    clientId: "cli_lena",
    when: now + 2 * HOUR,
    durationMins: 30,
    topic: "STAR-method storytelling drill",
    status: "scheduled",
  });

  // Follow-up reminders.
  Reminders.upsert({
    id: uid("rem"),
    advisorId: advisor.id,
    clientId: "cli_lena",
    text: "Lena's answers were thin — send STAR worksheet before her session.",
    dueAt: now + 4 * HOUR,
    done: false,
    source: "ai",
  });
  Reminders.upsert({
    id: uid("rem"),
    advisorId: advisor.id,
    clientId: "cli_sam",
    text: "Sam is nearly interview-ready — review his ML talking points.",
    dueAt: now + 1 * DAY,
    done: false,
    source: "ai",
  });
  Reminders.upsert({
    id: uid("rem"),
    advisorId: advisor.id,
    clientId: "cli_amir",
    text: "Send Amir the tailored Monzo resume draft.",
    dueAt: now - 2 * HOUR,
    done: false,
    source: "manual",
  });

  // Seed direct messages from advisor to each client.
  const msgSeed: Array<{ clientId: string; msgs: Array<{ text: string; daysAgo: number }> }> = [
    {
      clientId: "cli_amir",
      msgs: [
        { text: "Hi Amir! Great work on your mock interview — really impressive answers. Let's focus on your accessibility and GraphQL gaps when we meet.", daysAgo: 3 },
        { text: "I've reviewed your CV and I'm going to draft a tailored resume for Monzo. Keep an eye on your profile — I'll share it before our session.", daysAgo: 1 },
      ],
    },
    {
      clientId: "cli_lena",
      msgs: [
        { text: "Hi Lena, I've put together a STAR-method worksheet for you. Please have a look before our session tomorrow — it'll help sharpen your storytelling.", daysAgo: 2 },
      ],
    },
    {
      clientId: "cli_sam",
      msgs: [
        { text: "Sam, your SQL and Tableau answers were really strong! Your dashboard story landed well. Next step: build out a clear ML narrative so you're ready for that question.", daysAgo: 9 },
        { text: "You're nearly interview-ready. Let's review your ML talking points in our next session.", daysAgo: 3 },
      ],
    },
  ];
  for (const { clientId, msgs } of msgSeed) {
    for (const { text, daysAgo } of msgs) {
      Messages.add({ id: uid("msg"), advisorId: advisor.id, clientId, fromRole: "advisor", text, at: now - daysAgo * DAY });
    }
  }

  // Contact recency + advisor readiness approval.
  Users.update("cli_amir", { lastContactAt: now - 1 * DAY, readinessStatus: "employer_ready", careerInterests: "Fintech product teams" });
  Users.update("cli_sam", { lastContactAt: now - 9 * DAY, readinessStatus: "coaching", careerInterests: "Data / analytics, open to ML" });
  Users.update("cli_lena", { readinessStatus: "not_ready", careerInterests: "Consumer product marketing" });
  // Lena left without a logged contact → surfaces as needing a check-in.

  // Coaching notes + one piece of feedback shared with the client.
  Notes.add({
    id: uid("note"),
    advisorId: advisor.id,
    clientId: "cli_amir",
    text: "Strong mock — focus next session on accessibility and GraphQL gaps for Monzo.",
    at: now - 1 * DAY,
    kind: "interview",
    shared: false,
  });
  Notes.add({
    id: uid("note"),
    advisorId: advisor.id,
    clientId: "cli_amir",
    text: "Great work — you're employer-ready. Lead your resume with the 35% load-time win and the jQuery→React migration.",
    at: now - 1 * DAY,
    kind: "resume",
    shared: true,
  });
  Notes.add({
    id: uid("note"),
    advisorId: advisor.id,
    clientId: "cli_sam",
    text: "Confident on SQL/dashboards. Build out ML talking points before next round.",
    at: now - 9 * DAY,
    kind: "coaching",
    shared: false,
  });

  // Employer opportunities (shared catalog) + a few example referrals.
  Opportunities.save(OPPORTUNITIES);
  Referrals.upsert({
    id: uid("ref"),
    advisorId: advisor.id,
    clientId: "cli_amir",
    opportunityId: "opp_monzo",
    status: "interviewing",
    note: "Strong React/TS fit, interview-ready.",
    at: now - 3 * DAY,
  });
  Referrals.upsert({
    id: uid("ref"),
    advisorId: advisor.id,
    clientId: "cli_amir",
    opportunityId: "opp_stripe",
    status: "sent",
    at: now - 12 * HOUR,
  });
  Referrals.upsert({
    id: uid("ref"),
    advisorId: advisor.id,
    clientId: "cli_sam",
    opportunityId: "opp_internship",
    status: "placed",
    note: "Placed for the summer data internship.",
    at: now - 6 * DAY,
  });

  localStorage.setItem(KEYS.seeded, "1");
}

const OPPORTUNITIES: Opportunity[] = [
  {
    id: "opp_monzo",
    kind: "company",
    org: "Monzo",
    role: "Frontend Engineer",
    location: "London / Remote",
    skills: ["react", "typescript", "rest", "testing", "accessibility"],
    description: "Product-focused frontend role building accessible, responsive web apps with React and TypeScript.",
  },
  {
    id: "opp_spotify",
    kind: "company",
    org: "Spotify",
    role: "Product Marketing Manager",
    location: "Berlin",
    skills: ["marketing", "analytics", "communication", "seo", "stakeholder"],
    description: "Own positioning and go-to-market for a subscription product. Strong analytics and storytelling.",
  },
  {
    id: "opp_andela",
    kind: "recruiter",
    org: "Andela Talent Network",
    role: "Data Analyst",
    location: "Remote (Global)",
    skills: ["sql", "python", "tableau", "analytics", "communication"],
    description: "Recruiter network placing analysts with global teams. SQL + dashboarding + stakeholder comms.",
  },
  {
    id: "opp_gradscheme",
    kind: "grad",
    org: "Catalyst Graduate Scheme",
    role: "Graduate Software Engineer",
    location: "Manchester",
    skills: ["javascript", "react", "java", "testing"],
    description: "12-month rotational graduate programme for early-career engineers across web and backend teams.",
  },
  {
    id: "opp_internship",
    kind: "internship",
    org: "Northwind Labs",
    role: "Data Internship",
    location: "Remote",
    skills: ["python", "sql", "data", "analytics"],
    description: "Paid 3-month data internship — dashboards, analysis, and exposure to ML basics.",
  },
  {
    id: "opp_stripe",
    kind: "company",
    org: "Stripe",
    role: "Full-stack Engineer",
    location: "Dublin / Remote",
    skills: ["react", "typescript", "node", "api", "sql"],
    description: "Build payments products end to end. Comfortable across a modern web stack and APIs.",
  },
  {
    id: "opp_figma",
    kind: "company",
    org: "Figma",
    role: "Product Designer",
    location: "London",
    skills: ["figma", "ux", "design", "product", "communication"],
    description: "Own design for a core surface. Strong systems thinking and cross-functional collaboration.",
  },
  {
    id: "opp_hays",
    kind: "recruiter",
    org: "Hays Technology",
    role: "Frontend Developer (multiple clients)",
    location: "UK-wide",
    skills: ["react", "javascript", "typescript", "css"],
    description: "Agency recruiter with a pipeline of frontend roles across fintech and e-commerce clients.",
  },
  {
    id: "opp_deloitte_grad",
    kind: "grad",
    org: "Deloitte Digital",
    role: "Graduate Analyst",
    location: "London / Manchester",
    skills: ["analytics", "communication", "sql", "stakeholder"],
    description: "Graduate consulting scheme — data-driven client work with structured training and mentorship.",
  },
  {
    id: "opp_meta_intern",
    kind: "internship",
    org: "Meta",
    role: "Software Engineer Intern",
    location: "London",
    skills: ["python", "java", "react", "testing"],
    description: "12-week summer internship on a product team, with a dedicated mentor and intern project.",
  },
  {
    id: "opp_google_grad",
    kind: "grad",
    org: "Google",
    role: "Associate Product Marketing Manager",
    location: "Dublin",
    skills: ["marketing", "analytics", "communication", "seo"],
    description: "Rotational APMM programme for early-career marketers with strong analytical instincts.",
  },
];
