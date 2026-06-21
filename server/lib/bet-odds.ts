export const MIN_BET_ODDS = 1.01;

export function sanitizeBetOdds(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < MIN_BET_ODDS) return MIN_BET_ODDS;
  return Math.round(n * 100) / 100;
}

export function calculateTotalOdds(selections: { odds: number }[]): number {
  if (!selections.length) return 0;
  return selections.reduce((acc, s) => acc * sanitizeBetOdds(s.odds), 1);
}

export function calculatePotentialWin(stake: number, totalOdds: number): number {
  const s = Number(stake);
  if (!Number.isFinite(s) || s <= 0 || totalOdds <= 0) return 0;
  return Math.round(s * totalOdds * 100) / 100;
}
