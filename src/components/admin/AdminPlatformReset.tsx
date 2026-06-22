"use client";

import { useState } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { adminApi } from "@/lib/api";
import { PLATFORM_RESET_CONFIRM_PHRASE } from "@/lib/platform-reset-constants";
import { useToast } from "@/context/ToastContext";

interface AdminPlatformResetProps {
  onResetComplete?: () => void;
}

export function AdminPlatformReset({ onResetComplete }: AdminPlatformResetProps) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [resetting, setResetting] = useState(false);

  const canConfirm = confirmText.trim() === PLATFORM_RESET_CONFIRM_PHRASE;

  const handleReset = async () => {
    if (!canConfirm) {
      toast.error(`Type "${PLATFORM_RESET_CONFIRM_PHRASE}" to confirm`);
      return;
    }

    setResetting(true);
    try {
      const result = await adminApi.resetPlatform(confirmText.trim());
      toast.success(result.message || "Platform reset completed successfully");
      setOpen(false);
      setConfirmText("");
      onResetComplete?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Platform reset failed");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="card-premium p-5 border border-red-500/30 bg-red-500/[0.04] space-y-4">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-red-500/15 p-2 shrink-0">
          <AlertTriangle size={20} className="text-red-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold font-display text-red-300">Reset Platform</h3>
          <p className="text-xs text-bestbet-gray-muted mt-1 leading-relaxed">
            Clears all users except the main admin, deposits, withdrawals, bets, booking codes, and
            dashboard totals. Matches, site settings, API integrations, and admin credentials are
            preserved. A backup is created automatically before reset.
          </p>
        </div>
      </div>

      {!open ? (
        <Button
          variant="danger"
          size="sm"
          className="gap-2"
          onClick={() => setOpen(true)}
        >
          <RotateCcw size={16} />
          Reset Platform
        </Button>
      ) : (
        <div className="space-y-3 rounded-xl border border-red-500/20 bg-black/20 p-4">
          <p className="text-xs text-red-200/90">
            This action cannot be undone. Type{" "}
            <strong className="text-red-300">{PLATFORM_RESET_CONFIRM_PHRASE}</strong> below to confirm.
          </p>
          <Input
            label="Confirmation"
            placeholder={PLATFORM_RESET_CONFIRM_PHRASE}
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoComplete="off"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="danger"
              size="sm"
              loading={resetting}
              disabled={!canConfirm}
              onClick={() => void handleReset()}
            >
              Confirm Reset
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={resetting}
              onClick={() => {
                setOpen(false);
                setConfirmText("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
