"use client";

import { useEffect, useRef } from "react";
import { betsApi } from "@/lib/api";
import type { Match } from "@/lib/constants";
import { applyLiveMatchUpdates, toMatch } from "@/lib/match-utils";
import { logLiveMatchPayload } from "@/lib/live-score-utils";
import { MATCH_DATA_REFRESH_INTERVAL_MS } from "@/lib/match-polling";

/** Poll live match scores on the main refresh interval without dropping other fixtures. */
export function useLiveScorePolling(
  setMatches: React.Dispatch<React.SetStateAction<Match[]>>,
  enabled = true
) {
  const setRef = useRef(setMatches);
  setRef.current = setMatches;

  useEffect(() => {
    if (!enabled) return;

    const poll = async () => {
      try {
        const data = await betsApi.getMatches({ live: true, sport: "football" });
        const incoming = data.map(toMatch);
        setRef.current((prev) => applyLiveMatchUpdates(prev, incoming));
        logLiveMatchPayload("live-score-poll", incoming);
      } catch (err) {
        console.warn("[live-score-poll] failed, keeping cached matches:", err);
      }
    };

    const id = setInterval(poll, MATCH_DATA_REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [enabled]);
}
