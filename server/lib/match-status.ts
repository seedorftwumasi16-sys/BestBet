import { FULL_TIME_MINUTE } from "./match-timer";
import { boolFrom } from "../db/helpers";

/** API-Football / display codes for in-play fixtures. */
export const IN_PLAY_STATUS_SHORT = new Set(["1H", "2H", "HT", "LIVE", "INT", "ET", "P", "BT", "IN PLAY"]);

/** Finished match codes. */
export const FINISHED_STATUS_SHORT = new Set(["FT", "AET", "PEN"]);

/** Not started / scheduled codes. */
export const UPCOMING_STATUS_SHORT = new Set(["NS", "TBD", "PST", "SCHEDULED", ""]);

export type MatchDisplayStatus = "NS" | "LIVE" | "HT" | "FT" | "1H" | "2H";

export function normalizeStatusShort(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

export function isFinishedStatusShort(short: string): boolean {
  return FINISHED_STATUS_SHORT.has(short);
}

export function isInPlayStatusShort(short: string): boolean {
  return IN_PLAY_STATUS_SHORT.has(short);
}

export function resolveDisplayStatus(row: Record<string, unknown>): MatchDisplayStatus {
  const matchStatus = String(row.match_status || "").toLowerCase();
  const short = normalizeStatusShort(row.live_status_short);
  const minute = Math.max(0, Number(row.live_minute ?? 0));
  const fullTime = Math.min(120, Math.max(1, Number(row.match_duration_minutes ?? FULL_TIME_MINUTE) || FULL_TIME_MINUTE));

  if (matchStatus === "finished" || isFinishedStatusShort(short) || minute >= fullTime) {
    return "FT";
  }

  if (short === "HT" || boolFrom(row, "timer_paused")) return "HT";
  if (short === "1H") return "1H";
  if (short === "2H") return "2H";
  if (isInPlayStatusShort(short) || matchStatus === "live" || boolFrom(row, "is_live")) return "LIVE";
  return "NS";
}

export function shouldFinishMatch(row: Record<string, unknown>): boolean {
  const matchStatus = String(row.match_status || "").toLowerCase();
  if (matchStatus === "finished") return false;

  const short = normalizeStatusShort(row.live_status_short);
  if (isFinishedStatusShort(short)) return true;

  const minute = Math.max(0, Number(row.live_minute ?? 0));
  const fullTime = Math.min(120, Math.max(1, Number(row.match_duration_minutes ?? FULL_TIME_MINUTE) || FULL_TIME_MINUTE));
  if (minute >= fullTime) return true;

  return false;
}

export function isMatchInPlayRow(row: Record<string, unknown>): boolean {
  const matchStatus = String(row.match_status || "").toLowerCase();
  if (matchStatus === "finished") return false;

  const minute = Math.max(0, Number(row.live_minute ?? 0));
  const fullTime = Math.min(
    120,
    Math.max(1, Number(row.match_duration_minutes ?? FULL_TIME_MINUTE) || FULL_TIME_MINUTE)
  );
  if (minute >= fullTime && matchStatus !== "upcoming") return false;

  const short = normalizeStatusShort(row.live_status_short);
  const statusOverride = boolFrom(row, "status_override");

  if (statusOverride && matchStatus === "live" && boolFrom(row, "is_live")) {
    return true;
  }

  if (isFinishedStatusShort(short)) return false;
  if (isInPlayStatusShort(short)) return true;

  if (matchStatus === "live" && boolFrom(row, "is_live")) return true;
  if (statusOverride && boolFrom(row, "is_live") && matchStatus !== "finished") {
    return true;
  }

  return false;
}
