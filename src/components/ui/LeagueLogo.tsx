"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { DEFAULT_LEAGUE_BADGE, getLeagueBadgeUrl } from "@/lib/sports-assets";

interface LeagueLogoProps {
  leagueId?: string;
  leagueName?: string;
  sportsdbId?: string;
  badgeUrl?: string;
  alt?: string;
  className?: string;
}

export function LeagueLogo({
  leagueId,
  leagueName,
  sportsdbId,
  badgeUrl,
  alt,
  className,
}: LeagueLogoProps) {
  const initialSrc = badgeUrl || getLeagueBadgeUrl(leagueId, leagueName, sportsdbId);
  const [src, setSrc] = useState(initialSrc);
  const label = alt || leagueName || "League";

  return (
    <div
      className={cn(
        "relative shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-lg bg-white/5 ring-1 ring-white/10 overflow-hidden",
        className
      )}
    >
      <Image
        src={src}
        alt={label}
        fill
        unoptimized
        className="object-contain p-1.5 md:p-2"
        onError={() => {
          if (src !== DEFAULT_LEAGUE_BADGE) setSrc(DEFAULT_LEAGUE_BADGE);
        }}
      />
    </div>
  );
}
