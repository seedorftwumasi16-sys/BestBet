"use client";

import { LeagueLogo } from "@/components/ui/LeagueLogo";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { Badge } from "@/components/ui/Badge";
import { formatMatchDate, formatMatchTime } from "@/lib/utils";
import { getDisplayScores } from "@/lib/live-score-utils";
import type { Match } from "@/lib/constants";

export function ResultMatchRow({ match }: { match: Match }) {
  const scores = getDisplayScores(match);
  const homeScore = scores.home ?? 0;
  const awayScore = scores.away ?? 0;

  return (
    <article className="glass-panel rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col gap-2 sm:gap-3">
      <div className="flex items-center justify-between gap-2 text-[10px] sm:text-xs text-bestbet-gray-muted">
        <div className="flex items-center gap-2 min-w-0">
          <LeagueLogo
            leagueId={match.leagueId}
            leagueName={match.league}
            isSimulated={match.isSimulated}
            alt={match.league}
            className="w-5 h-5 shrink-0"
            compact
          />
          <span className="truncate font-medium">{match.league}</span>
        </div>
        <span className="shrink-0 tabular-nums">
          {formatMatchDate(match.startTime)} · {formatMatchTime(match.startTime)}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2 min-w-0 justify-end text-right">
          <p className="text-sm sm:text-base font-bold truncate">{match.homeTeam.name}</p>
          <TeamLogo
            name={match.homeTeam.name}
            shortName={match.homeTeam.shortName}
            logo={match.homeTeam.logo}
            className="w-8 h-8 sm:w-9 sm:h-9 shrink-0"
          />
        </div>

        <div className="flex flex-col items-center gap-1 px-2">
          <p className="text-lg sm:text-xl font-black tabular-nums tracking-wider">
            {homeScore} - {awayScore}
          </p>
          <Badge variant="default" className="text-[10px] px-2 py-0">
            FT
          </Badge>
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <TeamLogo
            name={match.awayTeam.name}
            shortName={match.awayTeam.shortName}
            logo={match.awayTeam.logo}
            className="w-8 h-8 sm:w-9 sm:h-9 shrink-0"
          />
          <p className="text-sm sm:text-base font-bold truncate">{match.awayTeam.name}</p>
        </div>
      </div>
    </article>
  );
}
