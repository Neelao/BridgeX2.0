import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Role, User } from "./types";
import { CurrentUser, Users, uid } from "./db";

interface AuthState {
  user: User | null;
  signInAdvisor: (email: string, password: string) => User;
  signInClient: (email: string, password: string) => User;
  registerAdvisor: (data: {
    name: string;
    email: string;
    password: string;
    title?: string;
    agency?: string;
  }) => User;
  signOut: () => void;
  refresh: () => void;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const id = CurrentUser.id();
    return id ? Users.byId(id) ?? null : null;
  });

  const refresh = () => {
    const id = CurrentUser.id();
    setUser(id ? Users.byId(id) ?? null : null);
  };

  // Keep in sync if data changes elsewhere (e.g. profile edits, other tabs).
  useEffect(() => {
    const onChange = () => refresh();
    window.addEventListener("bx:change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("bx:change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  function authenticate(email: string, password: string, role: Role): User {
    const found = Users.byEmail(email);
    if (!found) throw new Error("No account found for that email.");
    if (found.role !== role)
      throw new Error(
        role === "advisor"
          ? "This is a client account. Use the client sign-in."
          : "This is an advisor account. Use the advisor sign-in."
      );
    if (found.password !== password) throw new Error("Incorrect password.");
    CurrentUser.set(found.id);
    setUser(found);
    return found;
  }

  const value: AuthState = useMemo(
    () => ({
      user,
      signInAdvisor: (email, password) => authenticate(email, password, "advisor"),
      signInClient: (email, password) => authenticate(email, password, "client"),
      registerAdvisor: ({ name, email, password, title, agency }) => {
        if (Users.byEmail(email)) throw new Error("An account with that email already exists.");
        const advisor: User = {
          id: uid("adv"),
          role: "advisor",
          email: email.trim(),
          password,
          name: name.trim(),
          title,
          agency,
          createdAt: Date.now(),
        };
        Users.create(advisor);
        CurrentUser.set(advisor.id);
        setUser(advisor);
        return advisor;
      },
      signOut: () => {
        CurrentUser.set(null);
        setUser(null);
      },
      refresh,
    }),
    [user]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
