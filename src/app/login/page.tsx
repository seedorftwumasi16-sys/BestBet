"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/context/AuthContext";
import { getPostLoginPath } from "@/lib/constants";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const user = await login(email.trim(), password);
      router.push(getPostLoginPath(user.roleId));
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      variant="login"
      title="Welcome Back"
      subtitle="Log in to your BestBet account"
      footerText="Don't have an account?"
      footerLinkText="Register"
      footerLinkHref="/register"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl border border-bestbet-danger/30 bg-bestbet-danger/10 px-4 py-3 text-sm text-bestbet-danger">
            {error}
          </div>
        )}

        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          icon={<Mail size={18} />}
          autoComplete="email"
          required
        />

        <Input
          label="Password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          icon={<Lock size={18} />}
          showPasswordToggle
          autoComplete="current-password"
          required
        />

        <div className="flex items-center justify-between text-sm pt-1">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-[var(--border)] accent-bestbet-yellow"
            />
            <span className="text-bestbet-gray-muted">Remember me</span>
          </label>
          <Link href="#" className="font-medium text-bestbet-yellow hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full h-12 text-base font-bold mt-2"
          loading={loading}
          disabled={loading}
        >
          Log In
        </Button>
      </form>
    </AuthShell>
  );
}
