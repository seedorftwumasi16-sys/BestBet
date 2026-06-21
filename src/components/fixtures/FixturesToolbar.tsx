"use client";

import { FOOTBALL_COMPETITIONS } from "@/lib/constants";
import { SearchInput } from "@/components/ui/SearchInput";

interface FixturesToolbarProps {
  league: string;
  search: string;
  totalCount: number;
  onLeagueChange: (league: string) => void;
  onSearchChange: (search: string) => void;
}

export function FixturesToolbar({
  league,
  search,
  totalCount,
  onLeagueChange,
  onSearchChange,
}: FixturesToolbarProps) {
  return (
    <div className="glass-panel rounded-2xl p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-sm text-bestbet-gray-muted">
          <span className="font-bold text-white">{totalCount}</span> fixtures available
        </p>
      </div>
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="flex-1 min-w-0">
          <SearchInput
            placeholder="Search teams or competitions..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <select
          value={league}
          onChange={(e) => onLeagueChange(e.target.value)}
          className="h-14 min-w-[200px] rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm transition-all duration-300 focus:border-bestbet-yellow focus:outline-none focus:ring-2 focus:ring-bestbet-yellow/30"
          aria-label="Filter by competition"
        >
          {FOOTBALL_COMPETITIONS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
