import type { SportsDbEvent, SportsDbLeague, SportsDbTeam } from "./types";

const BASE_URL = "https://www.thesportsdb.com/api/v1/json";

export function getSportsApiKey(): string {
  return process.env.SPORTS_API_KEY?.trim() || "123";
}

function apiUrl(path: string): string {
  const key = getSportsApiKey();
  return `${BASE_URL}/${key}/${path}`;
}

async function fetchJson<T>(path: string, timeoutMs = 12000): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(apiUrl(path), { signal: controller.signal });
    if (!res.ok) {
      console.warn(`[sportsdb] HTTP ${res.status} for ${path}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[sportsdb] Request failed for ${path}:`, err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Tracked soccer leagues — IDs from TheSportsDB. */
export const TRACKED_LEAGUE_IDS = [
  "4328", // English Premier League
  "4331", // German Bundesliga
  "4332", // Italian Serie A
  "4334", // Spanish La Liga
  "4335", // French Ligue 1
  "4480", // UEFA Champions League
  "4429", // FIFA World Cup
];

export async function fetchAllLeagues(): Promise<SportsDbLeague[]> {
  const data = await fetchJson<{ leagues?: SportsDbLeague[] | null }>("all_leagues.php");
  const leagues = data?.leagues;
  if (!Array.isArray(leagues)) return [];
  return leagues.filter((l) => String(l.strSport).toLowerCase() === "soccer");
}

export async function fetchTeamsByLeagueName(leagueName: string): Promise<SportsDbTeam[]> {
  const encoded = encodeURIComponent(leagueName);
  const data = await fetchJson<{ teams?: SportsDbTeam[] | null }>(`search_all_teams.php?l=${encoded}`);
  const teams = data?.teams;
  return Array.isArray(teams) ? teams : [];
}

export async function fetchNextFixtures(leagueId: string): Promise<SportsDbEvent[]> {
  const data = await fetchJson<{ events?: SportsDbEvent[] | null }>(`eventsnextleague.php?id=${leagueId}`);
  const events = data?.events;
  return Array.isArray(events) ? events : [];
}

export async function fetchTodayFixtures(date: Date, sport = "Soccer"): Promise<SportsDbEvent[]> {
  const d = date.toISOString().slice(0, 10);
  const data = await fetchJson<{ events?: SportsDbEvent[] | null }>(
    `eventsday.php?d=${d}&s=${encodeURIComponent(sport)}`
  );
  const events = data?.events;
  return Array.isArray(events) ? events : [];
}

export async function fetchLiveScoresViaToday(): Promise<SportsDbEvent[]> {
  const today = await fetchTodayFixtures(new Date(), "Soccer");
  const liveStatuses = new Set(["1H", "2H", "HT", "ET", "P", "LIVE", "BT", "INT"]);
  return today.filter((e) => liveStatuses.has(String(e.strStatus || "").toUpperCase()));
}

export async function pingSportsApi(): Promise<boolean> {
  const data = await fetchJson<{ leagues?: unknown[] }>("all_leagues.php", 8000);
  return Array.isArray(data?.leagues);
}
