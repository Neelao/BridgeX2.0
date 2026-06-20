import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./lib/auth";
import type { Role } from "./lib/types";
import type { IconName } from "./components/Icon";
import { Shell } from "./components/Shell";

import Landing from "./pages/Landing";
import AdvisorSignIn from "./pages/AdvisorSignIn";
import AdvisorRegister from "./pages/AdvisorRegister";
import ClientSignIn from "./pages/ClientSignIn";

import AdvisorDashboard from "./pages/advisor/Dashboard";
import AdvisorClients from "./pages/advisor/Clients";
import AdvisorClientDetail from "./pages/advisor/ClientDetail";
import AdvisorResume from "./pages/advisor/ResumeWorkspace";
import AdvisorSchedule from "./pages/advisor/Schedule";

import ClientHome from "./pages/client/Home";
import ClientProfile from "./pages/client/Profile";
import ClientInterview from "./pages/client/Interview";
import ClientResults from "./pages/client/Results";
import ClientAdvisor from "./pages/client/Advisor";

const ADVISOR_NAV: { to: string; label: string; icon: IconName }[] = [
  { to: "/advisor", label: "Dashboard", icon: "dashboard" },
  { to: "/advisor/clients", label: "Clients", icon: "users" },
  { to: "/advisor/schedule", label: "Schedule", icon: "calendar" },
];

const CLIENT_NAV: { to: string; label: string; icon: IconName }[] = [
  { to: "/client", label: "Overview", icon: "dashboard" },
  { to: "/client/interview", label: "Mock Interview", icon: "mic" },
  { to: "/client/results", label: "Results", icon: "chart" },
  { to: "/client/advisor", label: "My Advisor", icon: "users" },
];

function Protected({ role, children }: { role: Role; children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to={role === "advisor" ? "/advisor/sign-in" : "/client/sign-in"} replace />;
  if (user.role !== role) return <Navigate to={user.role === "advisor" ? "/advisor" : "/client"} replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/advisor/sign-in" element={<AdvisorSignIn />} />
      <Route path="/advisor/register" element={<AdvisorRegister />} />
      <Route path="/client/sign-in" element={<ClientSignIn />} />

      {/* Advisor app */}
      <Route
        path="/advisor/*"
        element={
          <Protected role="advisor">
            <Shell nav={ADVISOR_NAV}>
              <Routes>
                <Route index element={<AdvisorDashboard />} />
                <Route path="clients" element={<AdvisorClients />} />
                <Route path="clients/:clientId" element={<AdvisorClientDetail />} />
                <Route path="clients/:clientId/resume" element={<AdvisorResume />} />
                <Route path="schedule" element={<AdvisorSchedule />} />
                <Route path="*" element={<Navigate to="/advisor" replace />} />
              </Routes>
            </Shell>
          </Protected>
        }
      />

      {/* Client app */}
      <Route
        path="/client/*"
        element={
          <Protected role="client">
            <Shell nav={CLIENT_NAV}>
              <Routes>
                <Route index element={<ClientHome />} />
                <Route path="profile" element={<ClientProfile />} />
                <Route path="interview" element={<ClientInterview />} />
                <Route path="results" element={<ClientResults />} />
                <Route path="advisor" element={<ClientAdvisor />} />
                <Route path="*" element={<Navigate to="/client" replace />} />
              </Routes>
            </Shell>
          </Protected>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
