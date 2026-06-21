import { cacheGet, cacheSet } from "../../services/redis";

const API_BASE = "https://v3.football.api-sports.io";

export interface ApiFootballFixtureStatus {
  short: string;
  long: string;
  elapsed: number | null;
}

export interface ApiFootballFixture {
  fixtureId: number;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamId: number;
  awayTeamId: number;
  homeLogo: string | null;
  awayLogo: string | null;
  homeGoals: number | null;
  awayGoals: number | null;
  status: ApiFootballFixtureStatus;
  leagueId: number;
  league: string;
  leagueLogo: string | null;
  season: number;
}

export interface ApiFootballStandingRow {
  rank: number;
  teamId: number;
  teamName: string;
  teamLogo: string | null;
  points: number;
  played: number;
  win: number;
  draw: number;
  lose: number;
  goalsFor: number;
  goalsAgainst: number;
  form: string | null;
}

export interface ApiFootballLeagueInfo {
  id: number;
  name: string;
  logo: string | null;
  country: string;
  season: number;
}

export interface ApiFootballTeamInfo {
  id: number;
  name: string;
  logo: string | null;
  country: string | null;
}

export interface ApiFootballCardCounts {
  homeYellow: number;
  awayYellow: number;
  homeRed: number;
  awayRed: number;
}

interface ApiFootballResponse<T> {
  response: T;
  errors?: Record<string, string> | string[] | unknown;
}

type RawFixtureRow = {
  fixture: { id: number; date: string; status: ApiFootballFixtureStatus };
  league: { id: number; name: string; logo: string | null; season: number };
  teams: {
    home: { id: number; name: string; logo: string | null };
    away: { id: number; name: string; logo: string | null };
  };
  goals: { home: number | null; away: number | null };
};

function mapFixtureRow(row: RawFixtureRow): ApiFootballFixture {
  return {
    fixtureId: row.fixture.id,
    date: row.fixture.date,
    homeTeam: row.teams.home.name,
    awayTeam: row.teams.away.name,
    homeTeamId: row.teams.home.id,
    awayTeamId: row.teams.away.id,
    homeLogo: row.teams.home.logo,
    awayLogo: row.teams.away.logo,
    homeGoals: row.goals.home,
    awayGoals: row.goals.away,
    status: row.fixture.status,
    leagueId: row.league.id,
    league: row.league.name,
    leagueLogo: row.league.logo,
    season: row.league.season,
  };
}

function hasApiErrors(body: ApiFootballResponse<unknown>): boolean {
  if (!body.errors) return false;
  if (Array.isArray(body.errors)) return body.errors.length > 0;
  if (typeof body.errors === "object") return Object.keys(body.errors as object).length > 0;
  return Boolean(body.errors);
}

async function apiRequest<T>(path: string, apiKey: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "x-apisports-key": apiKey },
    signal: AbortSignal.timeout(25_000),
  });

  if (!res.ok) {
    throw new Error(`API-Sports HTTP ${res.status} for ${path}`);
  }

  const body = (await res.json()) as ApiFootballResponse<T>;
  if (hasApiErrors(body)) {
    throw new Error(`API-Sports error: ${JSON.stringify(body.errors)}`);
  }

  return body.response;
}

/** Fetch from API-Sports; on failure return last good cached payload. */
export async function fetchWithCache<T>(
  path: string,
  apiKey: string,
  cacheKey: string,
  ttlSeconds = 120
): Promise<T> {
  try {
    const data = await apiRequest<T>(path, apiKey);
    await cacheSet(cacheKey, data, ttlSeconds);
    await cacheSet(`${cacheKey}:last`, data, 86_400);
    return data;
  } catch (err) {
    const stale = (await cacheGet<T>(`${cacheKey}:last`)) ?? (await cacheGet<T>(cacheKey));
    if (stale) {
      console.warn(`[apifootball] Using cached fallback for ${cacheKey}:`, err instanceof Error ? err.message : err);
      return stale;
    }
    throw err;
  }
}

export async function fetchLiveFixtures(apiKey: string): Promise<ApiFootballFixture[]> {
  const rows = await fetchWithCache<RawFixtureRow[]>(
    "/fixtures?live=all",
    apiKey,
    "apifootball:fixtures:live",
    55
  );
  console.log(`[apifootball] /fixtures?live=all → ${rows?.length ?? 0} fixtures`);
  return (rows || []).map(mapFixtureRow);
}

export async function fetchFixturesByDate(apiKey: string, date: string): Promise<ApiFootballFixture[]> {
  const rows = await fetchWithCache<RawFixtureRow[]>(
    `/fixtures?date=${date}`,
    apiKey,
    `apifootball:fixtures:date:${date}`,
    300
  );
  console.log(`[apifootball] /fixtures?date=${date} → ${rows?.length ?? 0} fixtures`);
  return (rows || []).map(mapFixtureRow);
}

export async function fetchFixturesByLeague(
  apiKey: string,
  leagueId: number,
  season: number
): Promise<ApiFootballFixture[]> {
  const rows = await fetchWithCache<RawFixtureRow[]>(
    `/fixtures?league=${leagueId}&season=${season}`,
    apiKey,
    `apifootball:fixtures:league:${leagueId}:${season}`,
    600
  );
  console.log(`[apifootball] /fixtures?league=${leagueId}&season=${season} → ${rows?.length ?? 0} fixtures`);
  return (rows || []).map(mapFixtureRow);
}

export async function fetchLeague(apiKey: string, leagueId: number, season: number): Promise<ApiFootballLeagueInfo | null> {
  const rows = await fetchWithCache<
    { league: { id: number; name: string; logo: string | null }; country: { name: string }; seasons: { year: number }[] }[]
  >(`/leagues?id=${leagueId}&season=${season}`, apiKey, `apifootball:league:${leagueId}:${season}`, 86400);

  const row = rows?.[0];
  if (!row) return null;

  return {
    id: row.league.id,
    name: row.league.name,
    logo: row.league.logo,
    country: row.country?.name ?? "",
    season,
  };
}

export async function fetchTeam(apiKey: string, teamId: number): Promise<ApiFootballTeamInfo | null> {
  const rows = await fetchWithCache<
    { team: { id: number; name: string; logo: string | null; country: string | null } }[]
  >(`/teams?id=${teamId}`, apiKey, `apifootball:team:${teamId}`, 86400);

  const row = rows?.[0];
  if (!row) return null;

  return {
    id: row.team.id,
    name: row.team.name,
    logo: row.team.logo,
    country: row.team.country,
  };
}

export async function fetchStandings(
  apiKey: string,
  leagueId: number,
  season: number
): Promise<ApiFootballStandingRow[]> {
  const rows = await fetchWithCache<
    {
      league: { standings: {
        rank: number;
        team: { id: number; name: string; logo: string | null };
        points: number;
        all: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } };
        form: string | null;
      }[][] };
    }[]
  >(`/standings?league=${leagueId}&season=${season}`, apiKey, `apifootball:standings:${leagueId}:${season}`, 3600);

  const groups = rows?.[0]?.league?.standings?.[0];
  if (!Array.isArray(groups)) return [];

  console.log(`[apifootball] /standings?league=${leagueId}&season=${season} → ${groups.length} teams`);

  return groups.map((row) => ({
    rank: row.rank,
    teamId: row.team.id,
    teamName: row.team.name,
    teamLogo: row.team.logo,
    points: row.points,
    played: row.all.played,
    win: row.all.win,
    draw: row.all.draw,
    lose: row.all.lose,
    goalsFor: row.all.goals.for,
    goalsAgainst: row.all.goals.against,
    form: row.form,
  }));
}

export async function fetchFixtureCardCounts(
  apiKey: string,
  fixtureId: number,
  homeTeam: string,
  awayTeam: string
): Promise<ApiFootballCardCounts> {
  const counts: ApiFootballCardCounts = {
    homeYellow: 0,
    awayYellow: 0,
    homeRed: 0,
    awayRed: 0,
  };

  try {
    const events = await fetchWithCache<
      { team: { name: string }; type: string; detail: string }[]
    >(
      `/fixtures/events?fixture=${fixtureId}`,
      apiKey,
      `apifootball:events:${fixtureId}`,
      60
    );

    const homeKey = homeTeam.toLowerCase();
    const awayKey = awayTeam.toLowerCase();

    for (const event of events || []) {
      if (event.type !== "Card") continue;
      const team = event.team.name.toLowerCase();
      const isHome = team.includes(homeKey) || homeKey.includes(team);
      const isAway = team.includes(awayKey) || awayKey.includes(team);
      const yellow = event.detail.toLowerCase().includes("yellow");
      const red = event.detail.toLowerCase().includes("red");

      if (yellow && isHome) counts.homeYellow += 1;
      if (yellow && isAway) counts.awayYellow += 1;
      if (red && isHome) counts.homeRed += 1;
      if (red && isAway) counts.awayRed += 1;
    }
  } catch {
    // cards optional
  }

  return counts;
}

export async function pingApiFootball(apiKey: string): Promise<boolean> {
  try {
    await fetchLiveFixtures(apiKey);
    return true;
  } catch {
    return false;
  }
}
