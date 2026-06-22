/** Premium homepage hero — local stadium imagery (Unsplash, royalty-free). */
export const HERO_STADIUM_IMAGE = "/images/hero-stadium-night.jpg";
export const HERO_FALLBACK_IMAGE = HERO_STADIUM_IMAGE;

/** Optional looped background video; falls back to HERO_STADIUM_IMAGE when missing. */
export const HERO_STADIUM_VIDEO = "/videos/hero-stadium.mp4";

export const HERO_SLIDE_BACKGROUNDS = {
  live: HERO_STADIUM_IMAGE,
  leagues: HERO_STADIUM_IMAGE,
  bonus: HERO_STADIUM_IMAGE,
} as const;

export function resolveHeroBackground(preferred?: string): string {
  if (!preferred) return HERO_FALLBACK_IMAGE;
  if (preferred.startsWith("/")) return preferred;
  return HERO_FALLBACK_IMAGE;
}
