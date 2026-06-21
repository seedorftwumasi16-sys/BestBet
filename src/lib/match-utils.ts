import type { MatchApi } from "@/lib/api";
import type { Match } from "@/lib/constants";
import { getLeagueBadgeUrl } from "@/lib/sports-assets";

export function mergeApiMatches(...lists: MatchApi[][]): MatchApi[] {
  const map = new Map<string, MatchApi>();
  for (const list of lists) {
    for (const match of list) {
      const existing = map.get(match.id);
      if (!existing || match.isLive || match.matchStatus === "live") {
        map.set(match.id, match);
      }
    }
  }
  return Array.from(map.values()).sort(
    (a, b) =>
      Number(b.isLive || b.matchStatus === "live") - Number(a.isLive || a.matchStatus === "live") ||
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
}

export function toMatch(m: MatchApi): Match {
  return {
    id: m.id,
    homeTeam: { id: m.id + "-h", ...m.homeTeam },
    awayTeam: { id: m.id + "-a", ...m.awayTeam },
    league: m.league,
    leagueId: m.leagueId,
    leagueBadge: m.leagueBadge || getLeagueBadgeUrl(m.leagueId, m.league),
    sport: m.sport,
    startTime: new Date(m.startTime),
    matchStatus: m.matchStatus,
    isLive: m.isLive,
    isFeatured: m.isFeatured,
    bettingSuspended: m.bettingSuspended,
    isSimulated: m.isSimulated,
    createdAt: m.createdAt ? new Date(m.createdAt) : new Date(m.startTime),
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
    return next.sort(
      (a, b) => Number(b.isLive) - Number(a.isLive) || a.startTime.getTime() - b.startTime.getTime()
    );
  }

  if (action === "created" || converted.isLive || converted.matchStatus === "live") {
    return [...matches, converted].sort(
      (a, b) => Number(b.isLive) - Number(a.isLive) || a.startTime.getTime() - b.startTime.getTime()
    );
  }

  return matches;
}
