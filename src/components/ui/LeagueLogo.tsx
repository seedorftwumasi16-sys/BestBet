"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  DEFAULT_LEAGUE_BADGE,
  SIMULATED_LEAGUE_BADGE,
  SIMULATED_LEAGUE_ICON,
  getLeagueBadgeUrl,
  isSimulatedLeague,
} from "@/lib/sports-assets";
import { Badge } from "@/components/ui/Badge";

interface LeagueLogoProps {
  leagueId?: string;
  leagueName?: string;
  sportsdbId?: string;
  badgeUrl?: string;
  isSimulated?: boolean;
  showSimulatedBadge?: boolean;
  compact?: boolean;
  alt?: string;
  className?: string;
}

export function LeagueLogo({
  leagueId,
  leagueName,
  sportsdbId,
  badgeUrl,
  isSimulated,
  showSimulatedBadge = false,
  compact = false,
  alt,
  className,
}: LeagueLogoProps) {
  const simulated = isSimulatedLeague(leagueName, leagueId, isSimulated);
  const defaultSrc = simulated
    ? compact
      ? SIMULATED_LEAGUE_ICON
      : SIMULATED_LEAGUE_BADGE
    : badgeUrl || getLeagueBadgeUrl(leagueId, leagueName, sportsdbId);
  const [src, setSrc] = useState(defaultSrc);
  const label = alt || leagueName || "League";

  return (
    <div className="flex items-center gap-1.5 shrink-0 min-w-0">
      <div
        className={cn(
          "relative shrink-0 rounded-lg bg-white/5 ring-1 overflow-hidden",
          simulated
            ? "ring-bestbet-yellow/40 shadow-[0_0_12px_rgba(212,175,55,0.35)]"
            : "ring-white/10",
          compact ? "w-6 h-6" : "w-12 h-12 md:w-16 md:h-16",
          className
        )}
      >
        <Image
          src={src}
          alt={label}
          fill
          unoptimized
          className={cn("object-contain", compact ? "p-0.5" : "p-1.5 md:p-2")}
          onError={() => {
            const fallback = simulated ? SIMULATED_LEAGUE_BADGE : DEFAULT_LEAGUE_BADGE;
            if (src !== fallback) setSrc(fallback);
          }}
        />
      </div>
      {simulated && showSimulatedBadge && (
        <Badge
          variant="warning"
          className="uppercase tracking-wider text-[8px] sm:text-[9px] px-1.5 py-0 shrink-0"
        >
          Simulated
        </Badge>
      )}
    </div>
  );
}
