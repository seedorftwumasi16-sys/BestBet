/** Local hero banner images — served from /public/images (never blocked by third-party CDNs). */
export const HERO_FALLBACK_IMAGE = "/images/hero-football.jpg";

export const HERO_SLIDE_BACKGROUNDS = {
  live: "/images/hero-football-live.jpg",
  leagues: "/images/hero-football.jpg",
  bonus: "/images/hero-football-bonus.jpg",
} as const;

/** Resolve slide background with guaranteed local fallback. */
export function resolveHeroBackground(preferred?: string): string {
  if (!preferred) return HERO_FALLBACK_IMAGE;
  if (preferred.startsWith("/")) return preferred;
  return HERO_FALLBACK_IMAGE;
}
