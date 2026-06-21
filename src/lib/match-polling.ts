/**
 * Background match data refresh interval.
 * Uses API polling only — never reloads the page or resets user forms/bet slip.
 */
export const MATCH_DATA_REFRESH_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes

/** @deprecated Use MATCH_DATA_REFRESH_INTERVAL_MS */
export const REFRESH_INTERVAL = MATCH_DATA_REFRESH_INTERVAL_MS;
