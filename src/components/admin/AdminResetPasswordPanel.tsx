"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { adminApi } from "@/lib/api";
import { useToast } from "@/context/ToastContext";

export function AdminResetPasswordPanel() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [saving, setSaving] = useState(false);

  const canSubmit = confirmText.trim() === "RESET ADMIN PASSWORD" && newPassword.trim().length >= 8;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await adminApi.resetAdminPassword({
        currentPassword: currentPassword.trim() || undefined,
        newPassword: newPassword.trim(),
        confirmText: confirmText.trim(),
      });
      toast.success("Admin password updated successfully");
      setOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmText("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset admin password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card-premium p-5 border border-bestbet-yellow/20 space-y-4">
      <div>
        <h3 className="text-sm font-bold font-display text-bestbet-yellow">Reset Admin Password</h3>
        <p className="text-xs text-bestbet-gray-muted mt-1">
          Update the primary super admin password for <strong>admin@bestbet.gh</strong>.
        </p>
      </div>

      {!open ? (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <KeyRound size={16} className="mr-1" />
          Reset Admin Password
        </Button>
      ) : (
        <div className="space-y-3">
          <Input
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            showPasswordToggle
            autoComplete="current-password"
          />
          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            showPasswordToggle
            autoComplete="new-password"
          />
          <Input
            label='Type "RESET ADMIN PASSWORD" to confirm'
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" size="sm" loading={saving} disabled={!canSubmit} onClick={() => void handleSubmit()}>
              Update Password
            </Button>
            <Button variant="ghost" size="sm" disabled={saving} onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
