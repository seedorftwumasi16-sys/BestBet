import type { Match } from "@/lib/constants";

const FULL_TIME = 90;
const HALFTIME = 45;

export function computeClientLiveMinute(match: Pick<
  Match,
  "isLive" | "matchStatus" | "liveMinute" | "timerPaused" | "minuteTickAt"
>): { minute: number; display: string; paused: boolean } {
  const stored = Math.max(0, Number(match.liveMinute ?? 0));
  const paused = !!match.timerPaused;
  const live = match.isLive || match.matchStatus === "live";

  if (match.matchStatus === "finished") {
    return { minute: stored || FULL_TIME, display: "FT", paused: false };
  }

  if (!live) {
    return { minute: stored, display: stored > 0 ? `${stored}'` : "0'", paused: false };
  }

  if (paused || stored === HALFTIME) {
    return { minute: HALFTIME, display: "HT", paused: true };
  }

  const tickRaw = match.minuteTickAt;
  const tickAt = tickRaw ? new Date(tickRaw).getTime() : NaN;
  if (!Number.isFinite(tickAt)) {
    return { minute: stored, display: `${stored}'`, paused: false };
  }

  const elapsed = Math.floor((Date.now() - tickAt) / 60_000);
  let minute = Math.min(FULL_TIME, stored + Math.max(0, elapsed));

  if (minute >= HALFTIME && stored < HALFTIME) {
    return { minute: HALFTIME, display: "HT", paused: true };
  }

  if (minute >= FULL_TIME) {
    return { minute: FULL_TIME, display: "FT", paused: false };
  }

  return { minute, display: `${minute}'`, paused: false };
}

export function formatMatchMinuteLabel(match: Match): string {
  if (match.liveMinuteDisplay && !match.minuteTickAt) {
    return match.liveMinuteDisplay;
  }
  return computeClientLiveMinute(match).display;
}
