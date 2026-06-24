"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shield, KeyRound } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { authApi } from "@/lib/api";
import { isLocalAdminRecoveryHost } from "@/lib/auth-storage";
import { useToast } from "@/context/ToastContext";

export default function AdminRecoveryPage() {
  const toast = useToast();
  const [allowed, setAllowed] = useState(false);
  const [adminExists, setAdminExists] = useState<boolean | null>(null);
  const [recoveryKey, setRecoveryKey] = useState("");
  const [newPassword, setNewPassword] = useState("Admin123@");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const local = isLocalAdminRecoveryHost();
    if (!local) {
      setAllowed(false);
      setChecking(false);
      return;
    }

    authApi
      .adminRecoveryStatus()
      .then((result) => {
        setAllowed(result.allowed);
        setAdminExists(result.adminExists);
      })
      .catch(() => {
        setAllowed(local);
        setAdminExists(null);
      })
      .finally(() => setChecking(false));
  }, []);

  const handleRestore = async () => {
    setLoading(true);
    try {
      const result = await authApi.adminRecoveryReset({
        recoveryKey: recoveryKey.trim() || undefined,
        newPassword: newPassword.trim() || undefined,
      });
      toast.success(result.message);
      if (result.passwordHint) {
        toast.success(`Dev hint: password set to ${result.passwordHint}`);
      }
      setAdminExists(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Admin recovery failed");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <AuthShell
        variant="login"
        title="Admin Recovery"
        subtitle="Checking access..."
        footerText="Ready to sign in?"
        footerLinkText="Login"
        footerLinkHref="/login"
      >
        <p className="text-sm text-bestbet-gray-muted">Please wait...</p>
      </AuthShell>
    );
  }

  if (!allowed) {
    return (
      <AuthShell
        variant="login"
        title="Admin Recovery"
        subtitle="Access restricted"
        footerText="Ready to sign in?"
        footerLinkText="Login"
        footerLinkHref="/login"
      >
        <div className="space-y-4 text-sm text-bestbet-gray-muted">
          <p>This page is only available on localhost or in development mode.</p>
          <Link href="/login" className="text-bestbet-yellow font-semibold hover:underline">
            Back to login
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      variant="login"
      title="Admin Recovery"
      subtitle="Restore the BestBet super admin account"
      footerText="Ready to sign in?"
      footerLinkText="Login"
      footerLinkHref="/login"
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-bestbet-yellow/20 bg-bestbet-yellow/5 p-4 text-sm">
          <div className="flex items-center gap-2 text-bestbet-yellow font-semibold mb-2">
            <Shield size={16} />
            Protected Admin
          </div>
          <p className="text-bestbet-gray-muted">
            Email: <strong className="text-white">admin@bestbet.gh</strong>
          </p>
          <p className="text-bestbet-gray-muted mt-1">
            Status: {adminExists ? "Account found" : "Account missing — restore recommended"}
          </p>
        </div>

        <Input
          label="Recovery Key (optional)"
          value={recoveryKey}
          onChange={(e) => setRecoveryKey(e.target.value)}
          placeholder="Only required if ADMIN_RECOVERY_KEY is set on the server"
        />

        <Input
          label="New Admin Password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          icon={<KeyRound size={18} />}
          showPasswordToggle
        />

        <Button variant="primary" size="lg" className="w-full" loading={loading} onClick={() => void handleRestore()}>
          Restore Admin Account
        </Button>

        <p className="text-xs text-bestbet-gray-muted leading-relaxed">
          This creates or repairs the protected super admin without deleting matches, settings, or user betting data.
        </p>
      </div>
    </AuthShell>
  );
}
