"use client";

import { cn } from "@/lib/utils";
import type { ResultsTab } from "@/lib/results-utils";

const TABS: { id: ResultsTab; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "week", label: "Last 7 Days" },
  { id: "all", label: "All Results" },
];

export function ResultsToolbar({
  active,
  onChange,
  count,
}: {
  active: ResultsTab;
  onChange: (tab: ResultsTab) => void;
  count: number;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors",
              active === tab.id
                ? "bg-bestbet-yellow text-bestbet-black"
                : "bg-[var(--card)] text-bestbet-gray-muted hover:text-white border border-[var(--border)]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <p className="text-sm text-bestbet-gray-muted">
        {count} finished {count === 1 ? "match" : "matches"} (last 30 days)
      </p>
    </div>
  );
}
