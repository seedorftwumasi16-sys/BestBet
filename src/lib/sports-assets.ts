/** Official league and team logos via TheSportsDB + football-data.org fallbacks */

export const DEFAULT_LEAGUE_BADGE =
  "https://r2.thesportsdb.com/images/media/league/badge/e7er5g1696521789.png";

export const LEAGUE_BADGE_BY_SPORTSDB_ID: Record<string, string> = {
  "4328": "https://r2.thesportsdb.com/images/media/league/badge/gasy9d1737743125.png",
  "4334": "https://r2.thesportsdb.com/images/media/league/badge/9f7z9d1742983155.png",
  "4332": "https://r2.thesportsdb.com/images/media/league/badge/67q3q21679951383.png",
  "4331": "https://r2.thesportsdb.com/images/media/league/badge/teqh1b1679952008.png",
  "4335": "https://r2.thesportsdb.com/images/media/league/badge/ja4it51687628717.png",
  "4480": "https://r2.thesportsdb.com/images/media/league/badge/facv1u1742998896.png",
  "4481": "https://r2.thesportsdb.com/images/media/league/badge/mlsr7d1718774547.png",
  "4429": "https://r2.thesportsdb.com/images/media/league/badge/e7er5g1696521789.png",
  "4748": "https://r2.thesportsdb.com/images/media/league/badge/jxmdm71728143121.png",
  "4974": "https://r2.thesportsdb.com/images/media/league/badge/fk51ll1691567032.png",
  "4503": "https://r2.thesportsdb.com/images/media/league/badge/8dmm9y1696521340.png",
};

const LEAGUE_BADGES: Record<string, string> = {
  epl: LEAGUE_BADGE_BY_SPORTSDB_ID["4328"],
  "english-premier-league": LEAGUE_BADGE_BY_SPORTSDB_ID["4328"],
  "premier league": LEAGUE_BADGE_BY_SPORTSDB_ID["4328"],
  laliga: LEAGUE_BADGE_BY_SPORTSDB_ID["4334"],
  "spanish-la-liga": LEAGUE_BADGE_BY_SPORTSDB_ID["4334"],
  "la liga": LEAGUE_BADGE_BY_SPORTSDB_ID["4334"],
  seriea: LEAGUE_BADGE_BY_SPORTSDB_ID["4332"],
  "italian-serie-a": LEAGUE_BADGE_BY_SPORTSDB_ID["4332"],
  "serie a": LEAGUE_BADGE_BY_SPORTSDB_ID["4332"],
  bundesliga: LEAGUE_BADGE_BY_SPORTSDB_ID["4331"],
  "german-bundesliga": LEAGUE_BADGE_BY_SPORTSDB_ID["4331"],
  ligue1: LEAGUE_BADGE_BY_SPORTSDB_ID["4335"],
  "french-ligue-1": LEAGUE_BADGE_BY_SPORTSDB_ID["4335"],
  "ligue 1": LEAGUE_BADGE_BY_SPORTSDB_ID["4335"],
  ucl: LEAGUE_BADGE_BY_SPORTSDB_ID["4480"],
  "uefa-champions-league": LEAGUE_BADGE_BY_SPORTSDB_ID["4480"],
  "champions league": LEAGUE_BADGE_BY_SPORTSDB_ID["4480"],
  uel: LEAGUE_BADGE_BY_SPORTSDB_ID["4481"],
  "uefa-europa-league": LEAGUE_BADGE_BY_SPORTSDB_ID["4481"],
  "europa league": LEAGUE_BADGE_BY_SPORTSDB_ID["4481"],
  worldcup: LEAGUE_BADGE_BY_SPORTSDB_ID["4429"],
  "fifa-world-cup": LEAGUE_BADGE_BY_SPORTSDB_ID["4429"],
  "world cup": LEAGUE_BADGE_BY_SPORTSDB_ID["4429"],
  caf: LEAGUE_BADGE_BY_SPORTSDB_ID["4748"],
  "caf-champions-league": LEAGUE_BADGE_BY_SPORTSDB_ID["4748"],
  ghana: LEAGUE_BADGE_BY_SPORTSDB_ID["4974"],
  "ghana-premier-league": LEAGUE_BADGE_BY_SPORTSDB_ID["4974"],
  "ghanaian premier league": LEAGUE_BADGE_BY_SPORTSDB_ID["4974"],
};

const TEAM_CRESTS: Record<string, string> = {
  "manchester city": "https://crests.football-data.org/65.png",
  "manchester united": "https://crests.football-data.org/66.png",
  liverpool: "https://crests.football-data.org/64.png",
  arsenal: "https://crests.football-data.org/57.png",
  chelsea: "https://crests.football-data.org/61.png",
  tottenham: "https://crests.football-data.org/73.png",
  "real madrid": "https://crests.football-data.org/86.png",
  barcelona: "https://crests.football-data.org/81.png",
  "atletico madrid": "https://crests.football-data.org/78.png",
  "bayern munich": "https://crests.football-data.org/5.png",
  "borussia dortmund": "https://crests.football-data.org/4.png",
  dortmund: "https://crests.football-data.org/4.png",
  "inter milan": "https://crests.football-data.org/108.png",
  "ac milan": "https://crests.football-data.org/98.png",
  juventus: "https://crests.football-data.org/109.png",
  napoli: "https://crests.football-data.org/113.png",
  "paris saint-germain": "https://crests.football-data.org/524.png",
  psg: "https://crests.football-data.org/524.png",
  "asante kotoko": "https://r2.thesportsdb.com/images/media/team/badge/xpqrrd1486979722.png",
  "hearts of oak": "https://r2.thesportsdb.com/images/media/team/badge/wwqrpq1423831769.png",
};

const BADGE_CACHE_KEY = "bestbet:league-badges:v1";
const BADGE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

let runtimeBadgeMap: Record<string, string> | null = null;

export function normalizeName(name: string): string {
  return name.toLowerCase().trim();
}

function readCachedBadges(): Record<string, string> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(BADGE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; badges: Record<string, string> };
    if (Date.now() - parsed.at > BADGE_CACHE_TTL_MS) return null;
    return parsed.badges;
  } catch {
    return null;
  }
}

function writeCachedBadges(badges: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(BADGE_CACHE_KEY, JSON.stringify({ at: Date.now(), badges }));
  } catch {
    // ignore quota errors
  }
}

export async function prefetchLeagueBadges(): Promise<Record<string, string>> {
  const cached = readCachedBadges();
  if (cached) {
    runtimeBadgeMap = { ...LEAGUE_BADGE_BY_SPORTSDB_ID, ...cached };
    return runtimeBadgeMap;
  }

  try {
    const res = await fetch("/api/sports/badges", { credentials: "include" });
    if (res.ok) {
      const badges = (await res.json()) as Record<string, string>;
      runtimeBadgeMap = { ...LEAGUE_BADGE_BY_SPORTSDB_ID, ...badges };
      writeCachedBadges(badges);
      return runtimeBadgeMap;
    }
  } catch {
    // use static fallbacks
  }

  runtimeBadgeMap = { ...LEAGUE_BADGE_BY_SPORTSDB_ID };
  return runtimeBadgeMap;
}

export function getCachedLeagueBadges(): Record<string, string> {
  return runtimeBadgeMap ?? LEAGUE_BADGE_BY_SPORTSDB_ID;
}

export function isHttpAsset(value?: string | null): value is string {
  return Boolean(value && (value.startsWith("http") || value.startsWith("/")));
}

export function getTeamLogoUrl(name: string, logo?: string): string | null {
  if (isHttpAsset(logo)) return logo;
  const key = normalizeName(name);
  if (TEAM_CRESTS[key]) return TEAM_CRESTS[key];
  for (const [team, url] of Object.entries(TEAM_CRESTS)) {
    if (key.includes(team) || team.includes(key)) return url;
  }
  return null;
}

export function getLeagueBadgeUrl(
  leagueId?: string,
  leagueName?: string,
  sportsdbId?: string
): string {
  const map = getCachedLeagueBadges();

  if (sportsdbId && map[sportsdbId]) return map[sportsdbId];
  if (sportsdbId && LEAGUE_BADGE_BY_SPORTSDB_ID[sportsdbId]) {
    return LEAGUE_BADGE_BY_SPORTSDB_ID[sportsdbId];
  }

  if (leagueId) {
    const idKey = leagueId.toLowerCase();
    if (map[idKey]) return map[idKey];
    if (LEAGUE_BADGES[idKey]) return LEAGUE_BADGES[idKey];
  }

  if (leagueName) {
    const nameKey = normalizeName(leagueName);
    if (map[nameKey]) return map[nameKey];
    if (LEAGUE_BADGES[nameKey]) return LEAGUE_BADGES[nameKey];
    for (const [alias, url] of Object.entries(LEAGUE_BADGES)) {
      if (nameKey.includes(alias) || alias.includes(nameKey)) return url;
    }
  }

  return map.default || DEFAULT_LEAGUE_BADGE;
}

export function getTeamInitials(name: string, shortName?: string): string {
  if (shortName && shortName.length <= 4) return shortName.toUpperCase();
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

export const HERO_BACKGROUNDS = [
  "https://images.unsplash.com/photo-1574629810360-7efbc5411887?w=1400&q=80",
  "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=1400&q=80",
  "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1400&q=80",
] as const;

export const POPULAR_LEAGUE_CHIPS = [
  { sportsdbId: "4328", label: "Premier League", country: "England" },
  { sportsdbId: "4334", label: "La Liga", country: "Spain" },
  { sportsdbId: "4332", label: "Serie A", country: "Italy" },
  { sportsdbId: "4331", label: "Bundesliga", country: "Germany" },
  { sportsdbId: "4335", label: "Ligue 1", country: "France" },
  { sportsdbId: "4480", label: "Champions League", country: "Europe" },
  { sportsdbId: "4481", label: "Europa League", country: "Europe" },
  { sportsdbId: "4429", label: "World Cup", country: "World" },
  { sportsdbId: "4748", label: "CAF Champions League", country: "Africa" },
  { sportsdbId: "4974", label: "Ghana Premier League", country: "Ghana" },
] as const;
