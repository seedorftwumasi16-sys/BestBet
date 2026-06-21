import { TRACKED_LEAGUES } from "./leagues";

/** Official TheSportsDB league badge URLs (PNG, high quality). */
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
  "4562": "https://r2.thesportsdb.com/images/media/league/badge/wqpyyq1696521520.png",
};

export const DEFAULT_LEAGUE_BADGE =
  "https://r2.thesportsdb.com/images/media/league/badge/e7er5g1696521789.png";

export const SIMULATED_LEAGUE_BADGE = "/images/leagues/simulated-league.svg";
export const SIMULATED_LEAGUE_ICON = "/images/leagues/simulated-league-icon.svg";

function isSimulatedLeagueName(name: string): boolean {
  const key = name.toLowerCase().trim();
  return key === "simulated league" || key.includes("simulated league") || key === "simulated";
}

const SLUG_TO_SPORTSDB: Record<string, string> = Object.fromEntries(
  TRACKED_LEAGUES.map((l) => [l.slug, l.id])
);

SLUG_TO_SPORTSDB["ghana-premier-league"] = "4974";
SLUG_TO_SPORTSDB["ghanaian-premier-league"] = "4974";
SLUG_TO_SPORTSDB["english-premier-league"] = "4328";
SLUG_TO_SPORTSDB["spanish-la-liga"] = "4334";
SLUG_TO_SPORTSDB["italian-serie-a"] = "4332";
SLUG_TO_SPORTSDB["german-bundesliga"] = "4331";
SLUG_TO_SPORTSDB["french-ligue-1"] = "4335";
SLUG_TO_SPORTSDB["uefa-champions-league"] = "4480";
SLUG_TO_SPORTSDB["uefa-europa-league"] = "4481";
SLUG_TO_SPORTSDB["fifa-world-cup"] = "4429";
SLUG_TO_SPORTSDB["caf-champions-league"] = "4748";

const NAME_ALIASES: Record<string, string> = {
  epl: "4328",
  "premier league": "4328",
  "english premier league": "4328",
  laliga: "4334",
  "la liga": "4334",
  "spanish la liga": "4334",
  seriea: "4332",
  "serie a": "4332",
  "italian serie a": "4332",
  bundesliga: "4331",
  "german bundesliga": "4331",
  ligue1: "4335",
  "ligue 1": "4335",
  "french ligue 1": "4335",
  ucl: "4480",
  "champions league": "4480",
  "uefa champions league": "4480",
  uel: "4481",
  "europa league": "4481",
  "uefa europa league": "4481",
  worldcup: "4429",
  "world cup": "4429",
  "fifa world cup": "4429",
  caf: "4748",
  "caf champions league": "4748",
  ghana: "4974",
  "ghana premier league": "4974",
  "ghanaian premier league": "4974",
};

function normalizeKey(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

export function resolveLeagueBadgeUrl(
  leagueName?: string | null,
  leagueSlug?: string | null,
  sportsdbId?: string | null,
  storedBadge?: string | null,
  isSimulated?: boolean
): string {
  const name = normalizeKey(String(leagueName ?? ""));
  const slug = String(leagueSlug ?? "").trim().toLowerCase();
  if (isSimulated || isSimulatedLeagueName(name) || slug === "simulated-league" || slug === "simulated") {
    return SIMULATED_LEAGUE_BADGE;
  }

  if (storedBadge && (storedBadge.startsWith("http") || storedBadge.startsWith("/"))) {
    return storedBadge;
  }

  const id = String(sportsdbId ?? "").trim();
  if (id && LEAGUE_BADGE_BY_SPORTSDB_ID[id]) {
    return LEAGUE_BADGE_BY_SPORTSDB_ID[id];
  }

  if (slug && SLUG_TO_SPORTSDB[slug]) {
    return LEAGUE_BADGE_BY_SPORTSDB_ID[SLUG_TO_SPORTSDB[slug]] ?? DEFAULT_LEAGUE_BADGE;
  }

  if (name && NAME_ALIASES[name]) {
    return LEAGUE_BADGE_BY_SPORTSDB_ID[NAME_ALIASES[name]] ?? DEFAULT_LEAGUE_BADGE;
  }

  for (const league of TRACKED_LEAGUES) {
    const leagueNameLower = league.name.toLowerCase();
    if (name.includes(leagueNameLower) || leagueNameLower.includes(name)) {
      return LEAGUE_BADGE_BY_SPORTSDB_ID[league.id] ?? DEFAULT_LEAGUE_BADGE;
    }
  }

  for (const [alias, sportsId] of Object.entries(NAME_ALIASES)) {
    if (name.includes(alias) || alias.includes(name)) {
      return LEAGUE_BADGE_BY_SPORTSDB_ID[sportsId] ?? DEFAULT_LEAGUE_BADGE;
    }
  }

  return DEFAULT_LEAGUE_BADGE;
}

export function isHttpLogo(value: unknown): value is string {
  return typeof value === "string" && (value.startsWith("http") || value.startsWith("/"));
}
