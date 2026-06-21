"use client";

import { useEffect, useState } from "react";
import type { Match } from "@/lib/constants";
import { computeClientLiveMinute } from "@/lib/match-timer";

export function useLiveMatchMinute(
  match: Pick<Match, "id" | "isLive" | "matchStatus" | "liveMinute" | "timerPaused" | "minuteTickAt">
) {
  const [state, setState] = useState(() => computeClientLiveMinute(match));

  useEffect(() => {
    setState(computeClientLiveMinute(match));

    if (!match.isLive && match.matchStatus !== "live") return;
    if (match.timerPaused) return;

    const interval = setInterval(() => {
      setState(computeClientLiveMinute(match));
    }, 15_000);

    return () => clearInterval(interval);
  }, [
    match.id,
    match.isLive,
    match.matchStatus,
    match.liveMinute,
    match.timerPaused,
    match.minuteTickAt,
  ]);

  return state;
}
