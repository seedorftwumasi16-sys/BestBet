import type { Match } from "@/lib/constants";

const CACHE_PREFIX = "bestbet:matches:";
const CACHE_TTL_MS = 30 * 60 * 1000;

type StoredMatch = Omit<Match, "startTime" | "createdAt"> & {
  startTime: string;
  createdAt?: string;
};

interface MatchCachePayload {
  savedAt: number;
  matches: StoredMatch[];
}

function serializeMatch(match: Match): StoredMatch {
  return {
    ...match,
    startTime: match.startTime.toISOString(),
    createdAt: match.createdAt?.toISOString(),
  };
}

function deserializeMatch(stored: StoredMatch): Match {
  return {
    ...stored,
    startTime: new Date(stored.startTime),
    createdAt: stored.createdAt ? new Date(stored.createdAt) : undefined,
  };
}

export function loadCachedMatches(cacheKey: string): Match[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${cacheKey}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MatchCachePayload;
    if (!Array.isArray(parsed.matches)) return [];
    if (Date.now() - parsed.savedAt > CACHE_TTL_MS) {
      console.warn(`[match-cache] Stale cache for ${cacheKey}, still using until API responds`);
    }
    return parsed.matches.map(deserializeMatch);
  } catch (err) {
    console.warn("[match-cache] Failed to read cache:", err);
    return [];
  }
}

export function saveCachedMatches(cacheKey: string, matches: Match[]): void {
  if (typeof window === "undefined" || matches.length === 0) return;
  try {
    const payload: MatchCachePayload = {
      savedAt: Date.now(),
      matches: matches.map(serializeMatch),
    };
    localStorage.setItem(`${CACHE_PREFIX}${cacheKey}`, JSON.stringify(payload));
  } catch (err) {
    console.warn("[match-cache] Failed to write cache:", err);
  }
}

export const HOMEPAGE_MATCH_CACHE_KEY = "homepage:football";
