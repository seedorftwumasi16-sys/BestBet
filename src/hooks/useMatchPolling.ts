"use client";

import { useEffect, useRef } from "react";
import { MATCH_DATA_REFRESH_INTERVAL_MS } from "@/lib/match-polling";

type PollOptions = {
  /** When true, skips the immediate fetch on mount (caller handles initial load). */
  skipInitial?: boolean;
  /** When false, polling is disabled entirely. */
  enabled?: boolean;
  /** Override default poll interval (ms). */
  intervalMs?: number;
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
  const { skipInitial = false, enabled = true, intervalMs = MATCH_DATA_REFRESH_INTERVAL_MS } = options;
  const fetchRef = useRef(fetchLatest);
  fetchRef.current = fetchLatest;

  useEffect(() => {
    if (!enabled) return;

    if (!skipInitial) {
      void fetchRef.current({ silent: false });
    }

    const intervalId = setInterval(() => {
      void fetchRef.current({ silent: true });
    }, intervalMs);

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller controls fetch identity via deps
  }, [enabled, skipInitial, intervalMs, ...deps]);
}
