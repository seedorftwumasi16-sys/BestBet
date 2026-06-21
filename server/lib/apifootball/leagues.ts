/** API-Football (api-sports.io) league IDs for tracked competitions. */
export interface ApiFootballLeague {
  apiId: number;
  name: string;
  slug: string;
  sportsdbId: string;
}

export const API_FOOTBALL_LEAGUES: ApiFootballLeague[] = [
  { apiId: 15, name: "FIFA Club World Cup", slug: "fifa-club-world-cup", sportsdbId: "4503" },
  { apiId: 39, name: "Premier League", slug: "english-premier-league", sportsdbId: "4328" },
  { apiId: 140, name: "La Liga", slug: "spanish-la-liga", sportsdbId: "4334" },
  { apiId: 78, name: "Bundesliga", slug: "german-bundesliga", sportsdbId: "4331" },
  { apiId: 135, name: "Serie A", slug: "italian-serie-a", sportsdbId: "4332" },
  { apiId: 61, name: "Ligue 1", slug: "french-ligue-1", sportsdbId: "4335" },
  { apiId: 2, name: "UEFA Champions League", slug: "uefa-champions-league", sportsdbId: "4480" },
  { apiId: 3, name: "UEFA Europa League", slug: "uefa-europa-league", sportsdbId: "4481" },
  { apiId: 200, name: "CAF Champions League", slug: "caf-champions-league", sportsdbId: "4748" },
  { apiId: 1, name: "World Cup", slug: "fifa-world-cup", sportsdbId: "4429" },
  { apiId: 274, name: "Ghana Premier League", slug: "ghana-premier-league", sportsdbId: "4974" },
];

export const API_FOOTBALL_LEAGUE_IDS = API_FOOTBALL_LEAGUES.map((l) => l.apiId);

export function resolveApiLeague(apiId: number): ApiFootballLeague | undefined {
  return API_FOOTBALL_LEAGUES.find((l) => l.apiId === apiId);
}

export function currentFootballSeason(): number {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  return month >= 6 ? year : year - 1;
}
