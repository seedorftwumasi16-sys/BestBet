"use client";

import { Badge } from "@/components/ui/Badge";
import type { Match } from "@/lib/constants";
import { getDisplayScores } from "@/lib/live-score-utils";
import { useLiveMatchMinute } from "@/hooks/useLiveMatchMinute";

export function MatchLiveScore({ match }: { match: Match }) {
  const liveTimer = useLiveMatchMinute(match);
  const scores = getDisplayScores(match);
  const isLive = match.isLive || match.matchStatus === "live";
  const showScore = isLive || match.matchStatus === "finished" || scores.hasActualScore;

  if (!showScore) return null;

  return (
    <div className="px-3 sm:px-4 py-2 border-b border-white/5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-lg sm:text-xl font-black tabular-nums truncate">{match.homeTeam.shortName}</span>
          <span className="text-xl sm:text-2xl font-black tabular-nums text-bestbet-yellow shrink-0">
            {scores.home} - {scores.away}
          </span>
          <span className="text-lg sm:text-xl font-black tabular-nums truncate text-right flex-1">
            {match.awayTeam.shortName}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {isLive ? (
            <>
              <Badge variant="live" className="text-[10px]">
                {match.liveStatusShort === "HT" ? "HT" : liveTimer.display}
              </Badge>
              <span className="text-[9px] font-bold uppercase text-bestbet-live">Live</span>
            </>
          ) : match.matchStatus === "finished" ? (
            <Badge variant="default" className="text-[10px]">FT</Badge>
          ) : null}
        </div>
      </div>

      {(match.homeYellowCards || match.awayYellowCards || match.homeRedCards || match.awayRedCards) ? (
        <div className="flex items-center justify-center gap-3 mt-2 text-[10px] text-bestbet-gray-muted">
          <span className="flex items-center gap-1">
            <span className="w-2 h-3 rounded-sm bg-yellow-400 inline-block" />
            {match.homeYellowCards ?? 0} - {match.awayYellowCards ?? 0}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-3 rounded-sm bg-red-500 inline-block" />
            {match.homeRedCards ?? 0} - {match.awayRedCards ?? 0}
          </span>
        </div>
      ) : null}

      {isLive && (scores.scoresPending || match.scoresPending) && (
        <p className="text-[10px] text-center text-bestbet-gray-muted mt-2">Live Score Pending</p>
      )}
    </div>
  );
}
