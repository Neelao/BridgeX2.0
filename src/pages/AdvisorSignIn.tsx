import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { AuthLayout, FormError } from "../components/AuthLayout";
import { Button, Input } from "../components/ui";

export default function AdvisorSignIn() {
  const { signInAdvisor } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("advisor@bridgex.io");
  const [password, setPassword] = useState("advisor123");
  const [error, setError] = useState<string>();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    try {
      signInAdvisor(email, password);
      navigate("/advisor");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <AuthLayout
      accent="advisor"
      title="Advisor sign in"
      subtitle="Access your client roster and dashboard."
      footer={
        <>
          New here?{" "}
          <Link to="/advisor/register" className="font-semibold text-steel-600 hover:underline">
            Create an advisor account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <FormError message={error} />
        <Input label="Work email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <Button type="submit" className="w-full">Sign in</Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Are you a job seeker?{" "}
        <Link to="/client/sign-in" className="font-semibold text-steel-600 hover:underline">
          Client sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
