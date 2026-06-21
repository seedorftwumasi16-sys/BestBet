/** TheSportsDB league IDs and slugs for tracked soccer competitions. */
export interface TrackedLeague {
  id: string;
  name: string;
  slug: string;
}

export const TRACKED_LEAGUES: TrackedLeague[] = [
  { id: "4503", name: "FIFA Club World Cup", slug: "fifa-club-world-cup" },
  { id: "4328", name: "English Premier League", slug: "english-premier-league" },
  { id: "4334", name: "Spanish La Liga", slug: "spanish-la-liga" },
  { id: "4331", name: "German Bundesliga", slug: "german-bundesliga" },
  { id: "4332", name: "Italian Serie A", slug: "italian-serie-a" },
  { id: "4335", name: "French Ligue 1", slug: "french-ligue-1" },
  { id: "4480", name: "UEFA Champions League", slug: "uefa-champions-league" },
  { id: "4481", name: "UEFA Europa League", slug: "uefa-europa-league" },
  { id: "4748", name: "CAF Champions League", slug: "caf-champions-league" },
  { id: "4429", name: "FIFA World Cup", slug: "fifa-world-cup" },
  { id: "4562", name: "International Friendly", slug: "international-friendly" },
];

export const TRACKED_LEAGUE_IDS = TRACKED_LEAGUES.map((l) => l.id);

const TRACKED_NAME_FRAGMENTS = TRACKED_LEAGUES.flatMap((l) => [
  l.name.toLowerCase(),
  l.slug.replace(/-/g, " "),
]);

export function isTrackedLeagueId(id: string | number | null | undefined): boolean {
  return TRACKED_LEAGUE_IDS.includes(String(id ?? ""));
}

export function isTrackedLeagueName(name: string | null | undefined): boolean {
  const value = String(name ?? "").toLowerCase();
  if (!value) return false;
  return TRACKED_NAME_FRAGMENTS.some(
    (fragment) => value.includes(fragment) || fragment.includes(value)
  );
}

export function leagueSlugFromName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function resolveTrackedLeague(eventLeagueId: string, eventLeagueName: string): TrackedLeague | null {
  const byId = TRACKED_LEAGUES.find((l) => l.id === String(eventLeagueId));
  if (byId) return byId;
  const lower = eventLeagueName.toLowerCase();
  return (
    TRACKED_LEAGUES.find(
      (l) => lower.includes(l.name.toLowerCase()) || l.name.toLowerCase().includes(lower)
    ) ?? null
  );
}
