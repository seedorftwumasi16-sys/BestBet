"use client";

import { useEffect, useRef } from "react";
import { MATCH_DATA_REFRESH_INTERVAL_MS } from "@/lib/match-polling";

type PollOptions = {
  /** When true, skips the immediate fetch on mount (caller handles initial load). */
  skipInitial?: boolean;
  /** When false, polling is disabled entirely. */
  enabled?: boolean;
};

/**
 * Background API polling for match data. Never triggers page reloads.
 * Live deltas should still flow via useLiveOdds (websocket).
 */
export function useMatchPolling(
  fetchLatest: (context: { silent: boolean }) => void | Promise<void>,
  deps: readonly unknown[] = [],
  options: PollOptions = {}
) {
  const { skipInitial = false, enabled = true } = options;
  const fetchRef = useRef(fetchLatest);
  fetchRef.current = fetchLatest;

  useEffect(() => {
    if (!enabled) return;

    if (!skipInitial) {
      void fetchRef.current({ silent: false });
    }

    const intervalId = setInterval(() => {
      void fetchRef.current({ silent: true });
    }, MATCH_DATA_REFRESH_INTERVAL_MS);

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller controls fetch identity via deps
  }, [enabled, skipInitial, ...deps]);
}
