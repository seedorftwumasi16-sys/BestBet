/** Team crests (football-data.org) + fallbacks for premium sportsbook UI */

const TEAM_CRESTS: Record<string, string> = {
  "manchester city": "https://crests.football-data.org/65.png",
  liverpool: "https://crests.football-data.org/64.png",
  "real madrid": "https://crests.football-data.org/86.png",
  barcelona: "https://crests.football-data.org/81.png",
  "bayern munich": "https://crests.football-data.org/5.png",
  dortmund: "https://crests.football-data.org/4.png",
  arsenal: "https://crests.football-data.org/57.png",
  chelsea: "https://crests.football-data.org/61.png",
  "inter milan": "https://crests.football-data.org/108.png",
  "ac milan": "https://crests.football-data.org/98.png",
  "la lakers": "https://cdn.nba.com/logos/nba/1610612747/global/L/logo.svg",
  "boston celtics": "https://cdn.nba.com/logos/nba/1610612738/global/L/logo.svg",
  "golden state": "https://cdn.nba.com/logos/nba/1610612744/global/L/logo.svg",
  "brooklyn nets": "https://cdn.nba.com/logos/nba/1610612751/global/L/logo.svg",
  "ny yankees": "https://www.mlbstatic.com/team-logos/147.svg",
  "la dodgers": "https://www.mlbstatic.com/team-logos/119.svg",
  poland: "https://flagcdn.com/w80/pl.png",
  brazil: "https://flagcdn.com/w80/br.png",
  india: "https://flagcdn.com/w80/in.png",
  australia: "https://flagcdn.com/w80/au.png",
};

export const LEAGUE_BADGES: Record<string, string> = {
  epl: "/images/leagues/epl.svg",
  laliga: "/images/leagues/laliga.svg",
  nba: "/images/leagues/nba.svg",
  ucl: "/images/leagues/ucl.svg",
  seriea: "/images/leagues/seriea.svg",
  bundesliga: "/images/leagues/bundesliga.svg",
  "premier league": "/images/leagues/epl.svg",
  "la liga": "/images/leagues/laliga.svg",
  "champions league": "/images/leagues/ucl.svg",
  "serie a": "/images/leagues/seriea.svg",
};

export function normalizeName(name: string): string {
  return name.toLowerCase().trim();
}

export function getTeamLogoUrl(name: string, shortName?: string): string | null {
  const key = normalizeName(name);
  if (TEAM_CRESTS[key]) return TEAM_CRESTS[key];
  for (const [team, url] of Object.entries(TEAM_CRESTS)) {
    if (key.includes(team) || team.includes(key)) return url;
  }
  return null;
}

export function getLeagueBadgeUrl(leagueId?: string, leagueName?: string): string {
  if (leagueId && LEAGUE_BADGES[leagueId.toLowerCase()]) {
    return LEAGUE_BADGES[leagueId.toLowerCase()];
  }
  if (leagueName && LEAGUE_BADGES[normalizeName(leagueName)]) {
    return LEAGUE_BADGES[normalizeName(leagueName)];
  }
  return "/images/leagues/default.svg";
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
