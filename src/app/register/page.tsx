"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, Phone, Ticket } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/context/AuthContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await register({ name, email, password, phone: phone || undefined, referralCode: referralCode || undefined });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      variant="register"
      title="Create Account"
      subtitle="Join BestBet and start winning"
      footerText="Already have an account?"
      footerLinkText="Log In"
      footerLinkHref="/login"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl border border-bestbet-danger/30 bg-bestbet-danger/10 px-4 py-3.5 text-sm text-bestbet-danger">
            {error}
          </div>
        )}

        <Input
          label="Full Name"
          placeholder="John Doe"
          value={name}
          onChange={(e) => setName(e.target.value)}
          icon={<User size={18} />}
          autoComplete="name"
          required
        />

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
          label="Phone Number (optional)"
          type="tel"
          placeholder="024XXXXXXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          icon={<Phone size={18} />}
          autoComplete="tel"
        />

        <Input
          label="Referral Code (optional)"
          placeholder="BBXXXXXX"
          value={referralCode}
          onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
          icon={<Ticket size={18} />}
        />

        <Input
          label="Password"
          type="password"
          placeholder="Create a strong password (8+ characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          icon={<Lock size={18} />}
          showPasswordToggle
          autoComplete="new-password"
          minLength={8}
          required
        />

        <label className="flex cursor-pointer items-start gap-3 pt-1 text-xs text-bestbet-gray-muted">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--border)] accent-bestbet-yellow"
            required
          />
          <span className="leading-relaxed">
            I agree to the{" "}
            <Link href="#" className="text-bestbet-yellow hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="#" className="text-bestbet-yellow hover:underline">
              Privacy Policy
            </Link>
          </span>
        </label>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="mt-1 w-full text-sm font-bold shadow-lg shadow-bestbet-yellow/15 transition-all duration-300 sm:text-base"
          loading={loading}
        >
          Create Account
        </Button>
      </form>
    </AuthShell>
  );
}
