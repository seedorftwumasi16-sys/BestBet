import type { Match } from "@/lib/constants";

export function isLiveOrFinished(match: Pick<Match, "isLive" | "matchStatus">): boolean {
  return !!(match.isLive || match.matchStatus === "live" || match.matchStatus === "finished");
}

/** Display scores with 0:0 fallback for live/finished when API has no score yet. */
export function getDisplayScores(match: Match): {
  home: number;
  away: number;
  hasActualScore: boolean;
  scoresPending: boolean;
} {
  const rawHome = match.homeScore;
  const rawAway = match.awayScore;
  const hasActualScore = rawHome != null && rawAway != null;
  const liveOrFinished = isLiveOrFinished(match);
  const scoresPending = liveOrFinished && !hasActualScore;

  if (hasActualScore) {
    return { home: rawHome, away: rawAway, hasActualScore: true, scoresPending: false };
  }

  if (liveOrFinished) {
    return { home: 0, away: 0, hasActualScore: false, scoresPending: true };
  }

  return { home: 0, away: 0, hasActualScore: false, scoresPending: false };
}

export function logLiveMatchPayload(source: string, matches: Match[]): void {
  const live = matches.filter((m) => m.isLive || m.matchStatus === "live");
  if (live.length === 0) return;

  console.log(
    `[BestBet:${source}] live match scores`,
    live.map((m) => {
      const scores = getDisplayScores(m);
      return {
        id: m.id,
        teams: `${m.homeTeam.name} vs ${m.awayTeam.name}`,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        display: `${scores.home}:${scores.away}`,
        scoresPending: m.scoresPending ?? scores.scoresPending,
        minute: m.liveMinuteDisplay ?? m.liveMinute,
        status: m.matchStatus,
        liveStatusShort: m.liveStatusShort,
      };
    })
  );
}
