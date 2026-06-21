import type { MatchApi } from "@/lib/api";
import type { Match } from "@/lib/constants";

export function toMatch(m: MatchApi): Match {
  return {
    id: m.id,
    homeTeam: { id: m.id + "-h", ...m.homeTeam },
    awayTeam: { id: m.id + "-a", ...m.awayTeam },
    league: m.league,
    leagueId: m.leagueId,
    sport: m.sport,
    startTime: new Date(m.startTime),
    matchStatus: m.matchStatus,
    isLive: m.isLive,
    isFeatured: m.isFeatured,
    bettingSuspended: m.bettingSuspended,
    liveMinute: m.liveMinute,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    odds: m.odds,
  };
}

export function applyMatchFeed(
  matches: Match[],
  action: "created" | "updated" | "deleted",
  match?: MatchApi,
  matchId?: string
): Match[] {
  if (action === "deleted" && matchId) {
    return matches.filter((m) => m.id !== matchId);
  }
  if (!match) return matches;

  const converted = toMatch(match);
  const index = matches.findIndex((m) => m.id === match.id);

  if (index >= 0) {
    const next = [...matches];
    next[index] = converted;
    return next;
  }

  if (action === "created") {
    return [...matches, converted].sort(
      (a, b) => Number(b.isLive) - Number(a.isLive) || a.startTime.getTime() - b.startTime.getTime()
    );
  }

  return matches;
}
