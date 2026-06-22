import type { MatchApi } from "@/lib/api";
import type { Match } from "@/lib/constants";
import { getLeagueBadgeUrl } from "@/lib/sports-assets";
import { FINISHED_STATUS_SHORT, getMatchFullTimeMinute, isFinishedMatch, isMatchInPlay } from "@/lib/match-status";

export function mergeApiMatches(...lists: MatchApi[][]): MatchApi[] {
  const map = new Map<string, MatchApi>();
  for (const list of lists) {
    for (const match of list) {
      const existing = map.get(match.id);
      if (!existing) {
        map.set(match.id, match);
        continue;
      }
      const incomingFinished = match.matchStatus === "finished";
      const existingFinished = existing.matchStatus === "finished";
      if (incomingFinished || (!existingFinished && (match.isLive || match.matchStatus === "live"))) {
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

export function applyOddsUpdate(
  match: Match,
  update: {
    odds: { home: number; away: number };
    homeScore?: number;
    awayScore?: number;
    liveMinute?: number;
    liveMinuteDisplay?: string;
    liveStatusShort?: string | null;
    homeYellowCards?: number;
    awayYellowCards?: number;
    homeRedCards?: number;
    awayRedCards?: number;
    liveDataAvailable?: boolean;
    timerPaused?: boolean;
    minuteTickAt?: string | null;
    matchStatus?: Match["matchStatus"];
    bettingSuspended?: boolean;
  }
): Match {
  const fullTime = getMatchFullTimeMinute(match);
  const finished =
    update.matchStatus === "finished" ||
    update.liveMinuteDisplay === "FT" ||
    FINISHED_STATUS_SHORT.has(String(update.liveStatusShort || "").toUpperCase()) ||
    ((update.liveMinute ?? match.liveMinute ?? 0) >= fullTime &&
      (update.matchStatus ?? match.matchStatus) !== "upcoming");

  const nextStatus = finished ? "finished" : (update.matchStatus ?? match.matchStatus);
  const nextIsLive = finished ? false : nextStatus === "live";

  return {
    ...match,
    odds: { ...match.odds, home: update.odds.home, away: update.odds.away },
    homeScore: update.homeScore ?? match.homeScore,
    awayScore: update.awayScore ?? match.awayScore,
    liveMinute: update.liveMinute ?? match.liveMinute,
    liveMinuteDisplay: finished ? "FT" : (update.liveMinuteDisplay ?? match.liveMinuteDisplay),
    liveStatusShort: finished ? "FT" : (update.liveStatusShort ?? match.liveStatusShort),
    homeYellowCards: update.homeYellowCards ?? match.homeYellowCards,
    awayYellowCards: update.awayYellowCards ?? match.awayYellowCards,
    homeRedCards: update.homeRedCards ?? match.homeRedCards,
    awayRedCards: update.awayRedCards ?? match.awayRedCards,
    liveDataAvailable: update.liveDataAvailable ?? match.liveDataAvailable,
    minuteTickAt: update.minuteTickAt !== undefined ? update.minuteTickAt : match.minuteTickAt,
    timerPaused: finished ? false : (update.timerPaused ?? match.timerPaused),
    matchStatus: nextStatus,
    isLive: nextIsLive,
    bettingSuspended: finished ? true : (update.bettingSuspended ?? match.bettingSuspended),
  };
}

export function toMatch(m: MatchApi): Match {
  return {
    id: m.id,
    homeTeam: { id: m.id + "-h", ...m.homeTeam },
    awayTeam: { id: m.id + "-a", ...m.awayTeam },
    league: m.league,
    leagueId: m.leagueId,
    leagueBadge: m.leagueBadge || getLeagueBadgeUrl(m.leagueId, m.league, undefined, m.isSimulated),
    sport: m.sport,
    startTime: new Date(m.startTime),
    matchStatus: m.matchStatus,
    isLive: m.isLive,
    isFeatured: m.isFeatured,
    bettingSuspended: m.bettingSuspended,
    isSimulated: m.isSimulated,
    createdAt: m.createdAt ? new Date(m.createdAt) : new Date(m.startTime),
    liveMinute: m.liveMinute,
    liveMinuteDisplay: m.liveMinuteDisplay,
    timerPaused: m.timerPaused,
    minuteTickAt: m.minuteTickAt,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    liveStatusShort: m.liveStatusShort ?? undefined,
    matchDurationMinutes: m.matchDurationMinutes,
    autoStart: m.autoStart,
    homeYellowCards: m.homeYellowCards,
    awayYellowCards: m.awayYellowCards,
    homeRedCards: m.homeRedCards,
    awayRedCards: m.awayRedCards,
    liveDataAvailable: m.liveDataAvailable,
    liveDataError: m.liveDataError ?? undefined,
    scoresPending: m.scoresPending,
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
  if (isFinishedMatch(converted)) {
    if (action === "deleted" || action === "updated") {
      return matches.filter((m) => m.id !== match.id);
    }
    return matches;
  }

  const index = matches.findIndex((m) => m.id === match.id);

  if (index >= 0) {
    const next = [...matches];
    next[index] = converted;
    return next.sort(
      (a, b) => Number(b.isLive) - Number(a.isLive) || a.startTime.getTime() - b.startTime.getTime()
    );
  }

  if (action === "created" || isMatchInPlay(converted)) {
    return [...matches, converted].sort(
      (a, b) => Number(b.isLive) - Number(a.isLive) || a.startTime.getTime() - b.startTime.getTime()
    );
  }

  return matches;
}

function matchSnapshotKey(m: Match): string {
  return [
    m.matchStatus,
    m.isLive,
    m.homeScore ?? "",
    m.awayScore ?? "",
    m.liveMinute ?? "",
    m.liveMinuteDisplay ?? "",
    m.liveStatusShort ?? "",
    m.homeYellowCards ?? "",
    m.awayYellowCards ?? "",
    m.homeRedCards ?? "",
    m.awayRedCards ?? "",
    m.liveDataAvailable ?? "",
    m.scoresPending ?? "",
    m.timerPaused ?? "",
    m.minuteTickAt ?? "",
    m.bettingSuspended ?? "",
    m.odds.home,
    m.odds.draw ?? "",
    m.odds.away,
  ].join("|");
}

/** Merge incoming matches without replacing unchanged rows (reduces UI churn on silent poll). */
export function mergeMatchLists(prev: Match[], incoming: Match[]): Match[] {
  if (incoming.length === 0) return prev;

  const incomingById = new Map(incoming.map((m) => [m.id, m]));
  const merged: Match[] = [];

  for (const existing of prev) {
    const next = incomingById.get(existing.id);
    if (!next) continue;
    incomingById.delete(existing.id);
    merged.push(matchSnapshotKey(existing) === matchSnapshotKey(next) ? existing : next);
  }

  for (const added of incomingById.values()) {
    merged.push(added);
  }

  return merged.sort(
    (a, b) =>
      Number(b.isLive || b.matchStatus === "live") - Number(a.isLive || a.matchStatus === "live") ||
      a.startTime.getTime() - b.startTime.getTime()
  );
}

/** Update live scores/minutes on existing rows without removing upcoming or simulated matches. */
export function applyLiveMatchUpdates(prev: Match[], liveIncoming: Match[]): Match[] {
  if (liveIncoming.length === 0) return prev;

  const liveById = new Map(liveIncoming.map((m) => [m.id, m]));
  const updated = prev.map((existing) => {
    const live = liveById.get(existing.id);
    if (!live) return existing;
    liveById.delete(existing.id);
    return matchSnapshotKey(existing) === matchSnapshotKey(live) ? existing : live;
  });

  for (const added of liveById.values()) {
    updated.push(added);
  }

  return updated.sort(
    (a, b) =>
      Number(b.isLive || b.matchStatus === "live") - Number(a.isLive || a.matchStatus === "live") ||
      a.startTime.getTime() - b.startTime.getTime()
  );
}
