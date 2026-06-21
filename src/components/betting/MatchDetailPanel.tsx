"use client";

import { LeagueLogo } from "@/components/ui/LeagueLogo";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { Badge } from "@/components/ui/Badge";
import type { Match } from "@/lib/constants";
import { getDisplayScores } from "@/lib/live-score-utils";
import { formatMatchDate, formatMatchTime } from "@/lib/utils";
import { useLiveMatchMinute } from "@/hooks/useLiveMatchMinute";

export function MatchDetailPanel({ match }: { match: Match }) {
  const liveTimer = useLiveMatchMinute(match);
  const scores = getDisplayScores(match);
  const isLive = match.isLive || match.matchStatus === "live";

  return (
    <div className="border-t border-white/5 px-3 sm:px-4 py-3 space-y-3 bg-black/20">
      <div className="flex items-center gap-2">
        <LeagueLogo
          leagueId={match.leagueId}
          leagueName={match.league}
          badgeUrl={match.leagueBadge}
          isSimulated={match.isSimulated}
          compact
          className="!w-6 !h-6"
        />
        <span className="text-xs font-semibold text-bestbet-gray-muted truncate">{match.league}</span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex flex-col items-center gap-1 min-w-0">
          <TeamLogo name={match.homeTeam.name} shortName={match.homeTeam.shortName} logo={match.homeTeam.logo} size="lg" />
          <span className="text-xs font-bold text-center truncate w-full">{match.homeTeam.name}</span>
        </div>
        <div className="text-center shrink-0">
          <p className="text-2xl font-black tabular-nums text-bestbet-yellow">
            {scores.home} - {scores.away}
          </p>
          {isLive ? (
            <Badge variant="live" className="mt-1 text-[10px]">
              {match.liveStatusShort === "HT" ? "Half Time" : `${liveTimer.display} · LIVE`}
            </Badge>
          ) : match.matchStatus === "finished" ? (
            <Badge variant="default" className="mt-1 text-[10px]">Full Time</Badge>
          ) : (
            <p className="text-[10px] text-bestbet-gray-muted mt-1">
              {formatMatchDate(match.startTime)} · {formatMatchTime(match.startTime)}
            </p>
          )}
        </div>
        <div className="flex flex-col items-center gap-1 min-w-0">
          <TeamLogo name={match.awayTeam.name} shortName={match.awayTeam.shortName} logo={match.awayTeam.logo} size="lg" />
          <span className="text-xs font-bold text-center truncate w-full">{match.awayTeam.name}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-lg bg-white/5 p-2 text-center">
          <p className="text-bestbet-gray-muted mb-1">Yellow Cards</p>
          <p className="font-bold tabular-nums">
            {match.homeYellowCards ?? 0} - {match.awayYellowCards ?? 0}
          </p>
        </div>
        <div className="rounded-lg bg-white/5 p-2 text-center">
          <p className="text-bestbet-gray-muted mb-1">Red Cards</p>
          <p className="font-bold tabular-nums">
            {match.homeRedCards ?? 0} - {match.awayRedCards ?? 0}
          </p>
        </div>
      </div>

      {isLive && (scores.scoresPending || match.scoresPending) && (
        <p className="text-xs text-center text-bestbet-gray-muted py-2 rounded-lg bg-white/5 border border-white/10">
          Live Score Pending
        </p>
      )}
    </div>
  );
}
