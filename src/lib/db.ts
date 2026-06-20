import type {
  ClientProfile,
  Interview,
  Note,
  Opportunity,
  Referral,
  Reminder,
  Resume,
  Session,
  TargetCompany,
  User,
} from "./types";

/**
 * A tiny localStorage-backed "database". Everything is front-end only, which
 * means data (and the logged-in session) persist across reloads and logouts in
 * the same browser — exactly what we need so a tester can log out as the
 * advisor and log straight back in as one of their clients.
 */

const KEYS = {
  users: "bx_users",
  profiles: "bx_profiles",
  companies: "bx_companies",
  interviews: "bx_interviews",
  sessions: "bx_sessions",
  reminders: "bx_reminders",
  notes: "bx_notes",
  resumes: "bx_resumes",
  opportunities: "bx_opportunities",
  referrals: "bx_referrals",
  currentUser: "bx_current_user",
  seeded: "bx_seeded_v4",
} as const;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
  // Let other parts of the app (and other tabs) react to changes.
  window.dispatchEvent(new CustomEvent("bx:change", { detail: key }));
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

/* ---------------- Users ---------------- */
export const Users = {
  all: () => read<User[]>(KEYS.users, []),
  save: (users: User[]) => write(KEYS.users, users),
  byId: (id: string) => Users.all().find((u) => u.id === id),
  byEmail: (email: string) =>
    Users.all().find((u) => u.email.toLowerCase() === email.trim().toLowerCase()),
  create: (user: User) => {
    const users = Users.all();
    users.push(user);
    Users.save(users);
    return user;
  },
  update: (id: string, patch: Partial<User>) => {
    const users = Users.all().map((u) => (u.id === id ? { ...u, ...patch } : u));
    Users.save(users);
    return users.find((u) => u.id === id);
  },
  clientsOf: (advisorId: string, includeArchived = false) =>
    Users.all().filter(
      (u) => u.role === "client" && u.advisorId === advisorId && (includeArchived || !u.archived)
    ),
  touchContact: (clientId: string) => Users.update(clientId, { lastContactAt: Date.now() }),
};

/* ---------------- Current session ---------------- */
export const CurrentUser = {
  id: () => read<string | null>(KEYS.currentUser, null),
  set: (id: string | null) => write(KEYS.currentUser, id),
};

/* ---------------- Profiles ---------------- */
export const Profiles = {
  all: () => read<ClientProfile[]>(KEYS.profiles, []),
  save: (rows: ClientProfile[]) => write(KEYS.profiles, rows),
  forClient: (clientId: string) => Profiles.all().find((p) => p.clientId === clientId),
  upsert: (profile: ClientProfile) => {
    const rows = Profiles.all().filter((p) => p.clientId !== profile.clientId);
    rows.push(profile);
    Profiles.save(rows);
    return profile;
  },
};

/* ---------------- Target companies ---------------- */
export const Companies = {
  all: () => read<TargetCompany[]>(KEYS.companies, []),
  save: (rows: TargetCompany[]) => write(KEYS.companies, rows),
  forClient: (clientId: string) => Companies.all().filter((c) => c.clientId === clientId),
  byId: (id: string) => Companies.all().find((c) => c.id === id),
  upsert: (company: TargetCompany) => {
    const rows = Companies.all().filter((c) => c.id !== company.id);
    rows.push(company);
    Companies.save(rows);
    return company;
  },
  remove: (id: string) => Companies.save(Companies.all().filter((c) => c.id !== id)),
};

/* ---------------- Interviews ---------------- */
export const Interviews = {
  all: () => read<Interview[]>(KEYS.interviews, []),
  save: (rows: Interview[]) => write(KEYS.interviews, rows),
  forClient: (clientId: string) =>
    Interviews.all()
      .filter((i) => i.clientId === clientId)
      .sort((a, b) => b.startedAt - a.startedAt),
  byId: (id: string) => Interviews.all().find((i) => i.id === id),
  upsert: (interview: Interview) => {
    const rows = Interviews.all().filter((i) => i.id !== interview.id);
    rows.push(interview);
    Interviews.save(rows);
    return interview;
  },
  latestComplete: (clientId: string) =>
    Interviews.forClient(clientId).find((i) => i.completedAt && i.analysis),
};

/* ---------------- Sessions ---------------- */
export const Sessions = {
  all: () => read<Session[]>(KEYS.sessions, []),
  save: (rows: Session[]) => write(KEYS.sessions, rows),
  forAdvisor: (advisorId: string) =>
    Sessions.all()
      .filter((s) => s.advisorId === advisorId)
      .sort((a, b) => a.when - b.when),
  forClient: (clientId: string) =>
    Sessions.all()
      .filter((s) => s.clientId === clientId)
      .sort((a, b) => a.when - b.when),
  upsert: (session: Session) => {
    const rows = Sessions.all().filter((s) => s.id !== session.id);
    rows.push(session);
    Sessions.save(rows);
    return session;
  },
  remove: (id: string) => Sessions.save(Sessions.all().filter((s) => s.id !== id)),
};

/* ---------------- Reminders ---------------- */
export const Reminders = {
  all: () => read<Reminder[]>(KEYS.reminders, []),
  save: (rows: Reminder[]) => write(KEYS.reminders, rows),
  forAdvisor: (advisorId: string) =>
    Reminders.all()
      .filter((r) => r.advisorId === advisorId)
      .sort((a, b) => a.dueAt - b.dueAt),
  upsert: (reminder: Reminder) => {
    const rows = Reminders.all().filter((r) => r.id !== reminder.id);
    rows.push(reminder);
    Reminders.save(rows);
    return reminder;
  },
  remove: (id: string) => Reminders.save(Reminders.all().filter((r) => r.id !== id)),
};

/* ---------------- Coaching notes ---------------- */
export const Notes = {
  all: () => read<Note[]>(KEYS.notes, []),
  save: (rows: Note[]) => write(KEYS.notes, rows),
  forClient: (clientId: string) =>
    Notes.all()
      .filter((n) => n.clientId === clientId)
      .sort((a, b) => b.at - a.at),
  add: (note: Note) => {
    const rows = Notes.all();
    rows.push(note);
    Notes.save(rows);
    return note;
  },
  remove: (id: string) => Notes.save(Notes.all().filter((n) => n.id !== id)),
};

/* ---------------- Resumes ---------------- */
export const Resumes = {
  all: () => read<Resume[]>(KEYS.resumes, []),
  save: (rows: Resume[]) => write(KEYS.resumes, rows),
  forClient: (clientId: string) => Resumes.all().find((r) => r.clientId === clientId),
  upsert: (resume: Resume) => {
    const rows = Resumes.all().filter((r) => r.clientId !== resume.clientId);
    rows.push(resume);
    Resumes.save(rows);
    return resume;
  },
};

/* ---------------- Employer opportunities (shared catalog) ---------------- */
export const Opportunities = {
  all: () => read<Opportunity[]>(KEYS.opportunities, []),
  save: (rows: Opportunity[]) => write(KEYS.opportunities, rows),
  byId: (id: string) => Opportunities.all().find((o) => o.id === id),
};

/* ---------------- Referrals ---------------- */
export const Referrals = {
  all: () => read<Referral[]>(KEYS.referrals, []),
  save: (rows: Referral[]) => write(KEYS.referrals, rows),
  forAdvisor: (advisorId: string) =>
    Referrals.all()
      .filter((r) => r.advisorId === advisorId)
      .sort((a, b) => b.at - a.at),
  forClient: (clientId: string) =>
    Referrals.all()
      .filter((r) => r.clientId === clientId)
      .sort((a, b) => b.at - a.at),
  forOpportunity: (opportunityId: string) => Referrals.all().filter((r) => r.opportunityId === opportunityId),
  upsert: (referral: Referral) => {
    const rows = Referrals.all().filter((r) => r.id !== referral.id);
    rows.push(referral);
    Referrals.save(rows);
    return referral;
  },
  remove: (id: string) => Referrals.save(Referrals.all().filter((r) => r.id !== id)),
};

export { KEYS };
