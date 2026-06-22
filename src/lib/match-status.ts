import type { Match } from "@/lib/constants";

export const FULL_TIME_MINUTE = 90;

export const IN_PLAY_STATUS_SHORT = new Set([
  "1H",
  "2H",
  "HT",
  "LIVE",
  "INT",
  "ET",
  "P",
  "BT",
  "IN PLAY",
]);
export const FINISHED_STATUS_SHORT = new Set(["FT", "AET", "PEN"]);
export const UPCOMING_STATUS_SHORT = new Set(["NS", "TBD", "PST", "SCHEDULED", ""]);

export type MatchDisplayStatus = "NS" | "LIVE" | "HT" | "FT" | "1H" | "2H";

export function normalizeStatusShort(value?: string | null): string {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

export function getMatchFullTimeMinute(
  match: Pick<Match, "matchDurationMinutes">
): number {
  const duration = match.matchDurationMinutes;
  if (duration != null && duration > 0) {
    return Math.min(120, Math.max(1, duration));
  }
  return FULL_TIME_MINUTE;
}

export function isFinishedMatch(
  match: Pick<
    Match,
    "matchStatus" | "liveStatusShort" | "liveMinute" | "liveMinuteDisplay" | "matchDurationMinutes"
  >
): boolean {
  if (match.matchStatus === "finished") return true;
  const short = normalizeStatusShort(match.liveStatusShort);
  if (FINISHED_STATUS_SHORT.has(short)) return true;
  if (match.liveMinuteDisplay === "FT") return true;
  const fullTime = getMatchFullTimeMinute(match);
  if ((match.liveMinute ?? 0) >= fullTime && match.matchStatus !== "upcoming") return true;
  return false;
}

export function isMatchInPlay(match: Match): boolean {
  if (isFinishedMatch(match)) return false;

  const short = normalizeStatusShort(match.liveStatusShort);
  if (IN_PLAY_STATUS_SHORT.has(short)) return true;

  if (match.matchStatus === "live" && match.isLive) return true;

  return false;
}

export function isMatchUpcoming(match: Match): boolean {
  if (isFinishedMatch(match)) return false;
  if (isMatchInPlay(match)) return false;
  return match.matchStatus === "upcoming" || (!match.isLive && match.matchStatus !== "live");
}

export function resolveDisplayStatus(match: Match): MatchDisplayStatus {
  if (isFinishedMatch(match)) return "FT";
  const short = normalizeStatusShort(match.liveStatusShort);
  if (short === "HT" || match.timerPaused) return "HT";
  if (short === "1H") return "1H";
  if (short === "2H") return "2H";
  if (isMatchInPlay(match)) return "LIVE";
  return "NS";
}
