export type Role = "advisor" | "client";

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
  archived?: boolean;
  lastContactAt?: number; // advisor's last logged touchpoint with this client
}

export interface Note {
  id: string;
  advisorId: string;
  clientId: string;
  text: string;
  at: number;
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
  summary: string;
  strengths: string[];
  gaps: string[];
  coachingActions: string[]; // advisor-facing follow-up actions
  resumeSuggestions: string[];
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
