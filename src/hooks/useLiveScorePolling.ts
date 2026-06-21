"use client";

import { useEffect, useRef } from "react";
import { betsApi } from "@/lib/api";
import type { Match } from "@/lib/constants";
import { mergeMatchLists, toMatch } from "@/lib/match-utils";
import { logLiveMatchPayload } from "@/lib/live-score-utils";

const LIVE_SCORE_POLL_MS = 45_000;

/** Poll live match scores every 45s without reloading the page. */
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
        setRef.current((prev) => mergeMatchLists(prev, incoming));
        logLiveMatchPayload("live-score-poll", incoming);
      } catch {
        // silent fallback — websocket may still update
      }
    };

    const id = setInterval(poll, LIVE_SCORE_POLL_MS);
    return () => clearInterval(id);
  }, [enabled]);
}
