import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { AuthLayout, FormError } from "../components/AuthLayout";
import { Button, Input, Icon } from "../components/ui";

export default function ClientSignIn() {
  const { signInClient } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("amir@demo.io");
  const [password, setPassword] = useState("client123");
  const [error, setError] = useState<string>();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    try {
      signInClient(email, password);
      navigate("/client");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <AuthLayout
      accent="client"
      title="Job seeker sign in"
      subtitle="Use the credentials your advisor gave you."
    >
      <form onSubmit={submit} className="space-y-4">
        <FormError message={error} />
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <Button type="submit" className="w-full">Sign in</Button>
      </form>
      <div className="mt-6 flex items-start gap-2.5 rounded-lg bg-paper-2 px-4 py-3 text-xs text-muted">
        <Icon name="shield" size={15} className="mt-0.5 shrink-0 text-steel-500" />
        <span>
          Don't have an account? Your career advisor creates it for you and shares the login —
          there's no public sign-up for job seekers.
        </span>
      </div>
      <p className="mt-5 text-center text-sm text-muted">
        Are you an advisor?{" "}
        <Link to="/advisor/sign-in" className="font-semibold text-steel-600 hover:underline">
          Advisor sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
