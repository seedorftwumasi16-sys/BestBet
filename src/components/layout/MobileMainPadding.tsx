"use client";

import { useBetSlip } from "@/context/BetSlipContext";
import { cn } from "@/lib/utils";

export function MobileMainPadding({ children }: { children: React.ReactNode }) {
  const { selections } = useBetSlip();
  const hasSlip = selections.length > 0;

  return (
    <main
      className={cn(
        "flex-1 overflow-x-hidden overflow-y-auto min-w-0 xl:pb-0",
        hasSlip ? "pb-[var(--mobile-slip-bar-clearance)]" : "pb-[var(--mobile-nav-clearance)]"
      )}
      id="main-content"
    >
      {children}
    </main>
  );
}
