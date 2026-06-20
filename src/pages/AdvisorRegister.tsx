import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { AuthLayout, FormError } from "../components/AuthLayout";
import { Button, Input } from "../components/ui";

export default function AdvisorRegister() {
  const { registerAdvisor } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", title: "", agency: "" });
  const [error, setError] = useState<string>();

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    if (form.password.length < 6) return setError("Password must be at least 6 characters.");
    try {
      registerAdvisor(form);
      navigate("/advisor");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <AuthLayout
      accent="advisor"
      title="Create advisor account"
      subtitle="Set up your workspace, then invite clients."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/advisor/sign-in" className="font-semibold text-steel-600 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <FormError message={error} />
        <Input label="Full name" value={form.name} onChange={set("name")} required placeholder="Dana Okafor" />
        <Input label="Work email" type="email" value={form.email} onChange={set("email")} required placeholder="you@agency.com" />
        <Input label="Password" type="password" value={form.password} onChange={set("password")} required hint="At least 6 characters" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Title" value={form.title} onChange={set("title")} placeholder="Career Advisor" />
          <Input label="Agency" value={form.agency} onChange={set("agency")} placeholder="BridgeX Careers" />
        </div>
        <Button type="submit" className="w-full">Create account</Button>
      </form>
    </AuthLayout>
  );
}
