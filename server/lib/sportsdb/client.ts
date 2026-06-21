import type { SportsDbEvent, SportsDbLeague, SportsDbTeam } from "./types";
import { TRACKED_LEAGUE_IDS } from "./leagues";

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
    const data = (await res.json()) as T;
    if (path.includes("eventsday.php") || path.includes("eventsnextleague.php")) {
      const events = (data as { events?: Array<{ strStatus?: string; intHomeScore?: string; intAwayScore?: string; strHomeTeam?: string; strAwayTeam?: string }> })?.events;
      if (Array.isArray(events) && events.length > 0) {
        const live = events.filter((e) => ["1H", "2H", "HT", "ET", "P", "LIVE", "BT", "INT"].includes(String(e.strStatus || "").toUpperCase()));
        if (live.length > 0) {
          console.log(
            `[sportsdb] ${path} live sample:`,
            live.slice(0, 3).map((e) => ({
              match: `${e.strHomeTeam} vs ${e.strAwayTeam}`,
              score: `${e.intHomeScore ?? "?"}-${e.intAwayScore ?? "?"}`,
              status: e.strStatus,
            }))
          );
        }
      }
    }
    return data;
  } catch (err) {
    console.warn(`[sportsdb] Request failed for ${path}:`, err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export { TRACKED_LEAGUE_IDS, TRACKED_LEAGUES } from "./leagues";

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
  const count = Array.isArray(events) ? events.length : 0;
  console.log(`[sportsdb] eventsnextleague.php?id=${leagueId} → ${count} events`);
  return Array.isArray(events) ? events : [];
}

export async function fetchSeasonFixtures(leagueId: string, season: string): Promise<SportsDbEvent[]> {
  const data = await fetchJson<{ events?: SportsDbEvent[] | null }>(
    `eventsseason.php?id=${leagueId}&s=${encodeURIComponent(season)}`
  );
  const events = data?.events;
  const count = Array.isArray(events) ? events.length : 0;
  console.log(`[sportsdb] eventsseason.php?id=${leagueId}&s=${season} → ${count} events`);
  return Array.isArray(events) ? events : [];
}

export async function fetchTodayFixtures(date: Date, sport = "Soccer"): Promise<SportsDbEvent[]> {
  const d = date.toISOString().slice(0, 10);
  const data = await fetchJson<{ events?: SportsDbEvent[] | null }>(
    `eventsday.php?d=${d}&s=${encodeURIComponent(sport)}`
  );
  const events = data?.events;
  const count = Array.isArray(events) ? events.length : 0;
  console.log(`[sportsdb] eventsday.php?d=${d}&s=${sport} → ${count} events`);
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

export function currentFootballSeasons(): string[] {
  const year = new Date().getFullYear();
  const month = new Date().getMonth();
  const primary = month >= 6 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  return [primary, String(year), `${year}-${year + 1}`, `${year - 1}-${year}`];
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
