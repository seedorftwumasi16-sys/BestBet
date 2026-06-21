const API_BASE = "https://v3.football.api-sports.io";

export interface ApiFootballFixtureStatus {
  short: string;
  long: string;
  elapsed: number | null;
}

export interface ApiFootballLiveFixture {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number | null;
  awayGoals: number | null;
  status: ApiFootballFixtureStatus;
  league: string;
  date: string;
}

export interface ApiFootballCardCounts {
  homeYellow: number;
  awayYellow: number;
  homeRed: number;
  awayRed: number;
}

interface ApiFootballResponse<T> {
  response: T;
  errors?: Record<string, string> | string[];
}

export async function fetchLiveFixtures(apiKey: string): Promise<ApiFootballLiveFixture[]> {
  const res = await fetch(`${API_BASE}/fixtures?live=all`, {
    headers: {
      "x-apisports-key": apiKey,
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    throw new Error(`API-Football HTTP ${res.status}`);
  }

  const body = (await res.json()) as ApiFootballResponse<
    {
      fixture: { id: number; date: string; status: ApiFootballFixtureStatus };
      league: { name: string };
      teams: { home: { name: string }; away: { name: string } };
      goals: { home: number | null; away: number | null };
    }[]
  >;

  if (body.errors && Object.keys(body.errors).length > 0) {
    throw new Error(`API-Football: ${JSON.stringify(body.errors)}`);
  }

  return (body.response || []).map((row) => ({
    fixtureId: row.fixture.id,
    homeTeam: row.teams.home.name,
    awayTeam: row.teams.away.name,
    homeGoals: row.goals.home,
    awayGoals: row.goals.away,
    status: row.fixture.status,
    league: row.league.name,
    date: row.fixture.date,
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
    const res = await fetch(`${API_BASE}/fixtures/events?fixture=${fixtureId}`, {
      headers: { "x-apisports-key": apiKey },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return counts;

    const body = (await res.json()) as ApiFootballResponse<
      { team: { name: string }; type: string; detail: string }[]
    >;

    const homeKey = homeTeam.toLowerCase();
    const awayKey = awayTeam.toLowerCase();

    for (const event of body.response || []) {
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
