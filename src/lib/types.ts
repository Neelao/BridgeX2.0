export type Role = "advisor" | "client";

/** Advisor-controlled readiness gate (final approval stays with the advisor). */
export type ReadinessStatus = "not_ready" | "coaching" | "employer_ready";

export type NoteKind = "coaching" | "resume" | "interview" | "career";

export interface User {
  id: string;
  role: Role;
  email: string;
  password: string; // plaintext — this is a front-end demo only, never do this in production
  name: string;
  createdAt: number;
  // advisor-only
  title?: string;
  agency?: string;
  // client-only
  advisorId?: string;
  phone?: string;
  targetRole?: string;
  careerInterests?: string;
  archived?: boolean;
  lastContactAt?: number; // advisor's last logged touchpoint with this client
  readinessStatus?: ReadinessStatus; // advisor's manual approval gate
}

export interface Note {
  id: string;
  advisorId: string;
  clientId: string;
  text: string;
  at: number;
  kind: NoteKind;
  shared: boolean; // visible to the client as advisor feedback
}

export interface Resume {
  clientId: string;
  headline: string;
  summary: string;
  skills: string[];
  experience: string; // editable bullet block
  education: string;
  updatedAt: number;
  generatedFromCompanyId?: string;
}

export interface ClientProfile {
  clientId: string;
  headline: string;
  location: string;
  phone: string;
  yearsExperience: number;
  cvText: string; // pasted / "uploaded" CV content
  cvFileName?: string;
  updatedAt: number;
}

export interface TargetCompany {
  id: string;
  clientId: string;
  company: string;
  roleTitle: string;
  jobDescription: string; // raw requirements / criteria pasted in
  aiSummary?: CompanySummary;
  createdAt: number;
}

export interface CompanySummary {
  mustHaves: string[];
  niceToHaves: string[];
  keywords: string[];
  resumeTips: string[];
  fitNote: string;
}

export interface ChatMessage {
  id: string;
  role: "interviewer" | "candidate";
  text: string;
  at: number;
}

export interface Interview {
  id: string;
  clientId: string;
  targetCompanyId?: string;
  startedAt: number;
  completedAt?: number;
  messages: ChatMessage[];
  analysis?: InterviewAnalysis;
}

export interface InterviewAnalysis {
  readinessScore: number; // 0-100
  communication: number; // 0-100
  confidence: number; // 0-100
  technical: number; // 0-100
  summary: string;
  strengths: string[];
  gaps: string[];
  coachingActions: string[]; // advisor-facing follow-up actions
  resumeSuggestions: string[];
}

export interface CandidateSummary {
  background: string;
  careerGoals: string;
  strengths: string[];
  weaknesses: string[];
  supportAreas: string[];
}

export type OpportunityKind = "company" | "recruiter" | "grad" | "internship";

export interface Opportunity {
  id: string;
  kind: OpportunityKind;
  org: string;
  role: string;
  location: string;
  skills: string[];
  description: string;
}

export type ReferralStatus = "suggested" | "sent" | "interviewing" | "placed" | "declined";

export interface Referral {
  id: string;
  advisorId: string;
  clientId: string;
  opportunityId: string;
  status: ReferralStatus;
  note?: string;
  at: number;
}

export interface MatchResult {
  clientId: string;
  score: number; // 0-100
  reasons: string[];
}

export interface Session {
  id: string;
  advisorId: string;
  clientId: string;
  when: number; // scheduled timestamp
  durationMins: number;
  topic: string;
  notes?: string;
  status: "scheduled" | "done";
}

export interface Reminder {
  id: string;
  advisorId: string;
  clientId: string;
  text: string;
  dueAt: number;
  done: boolean;
  source: "manual" | "ai";
}
