/** Standard correct score selections for football */
export const CORRECT_SCORE_SCORES = [
  "0-0",
  "1-0",
  "2-0",
  "2-1",
  "3-0",
  "3-1",
  "3-2",
  "4-0",
  "4-1",
  "4-2",
  "4-3",
  "0-1",
  "0-2",
  "1-2",
  "1-3",
  "2-3",
  "0-3",
] as const;

export const CORRECT_SCORE_SPECIALS = [
  "any_other_home",
  "any_other_away",
  "any_other_draw",
] as const;

export const CORRECT_SCORE_LABELS: Record<string, string> = {
  "0-0": "0-0",
  "1-0": "1-0",
  "2-0": "2-0",
  "2-1": "2-1",
  "3-0": "3-0",
  "3-1": "3-1",
  "3-2": "3-2",
  "4-0": "4-0",
  "4-1": "4-1",
  "4-2": "4-2",
  "4-3": "4-3",
  "0-1": "0-1",
  "0-2": "0-2",
  "1-2": "1-2",
  "1-3": "1-3",
  "2-3": "2-3",
  "0-3": "0-3",
  any_other_home: "Any Other Home Win",
  any_other_away: "Any Other Away Win",
  any_other_draw: "Any Other Draw",
};

export const DOUBLE_CHANCE_SELECTIONS = ["home_draw", "home_away", "draw_away"] as const;

export const DOUBLE_CHANCE_LABELS: Record<string, string> = {
  home_draw: "1X",
  home_away: "12",
  draw_away: "X2",
};

export function defaultCorrectScoreOdds(): Record<string, number> {
  const odds: Record<string, number> = {};
  for (const score of CORRECT_SCORE_SCORES) {
    odds[score] = score === "0-0" ? 8.5 : score === "1-0" ? 7.0 : 9.0 + Math.random() * 20;
    odds[score] = Math.round(odds[score] * 100) / 100;
  }
  odds.any_other_home = 12;
  odds.any_other_away = 14;
  odds.any_other_draw = 11;
  return odds;
}

export function defaultDoubleChanceOdds(home: number, draw: number, away: number) {
  return {
    home_draw: Math.round((1 / (1 / home + 1 / draw)) * 100) / 100 || 1.25,
    home_away: Math.round((1 / (1 / home + 1 / away)) * 100) / 100 || 1.3,
    draw_away: Math.round((1 / (1 / draw + 1 / away)) * 100) / 100 || 1.35,
  };
}

function parseScore(score: string): [number, number] | null {
  const parts = score.split("-");
  if (parts.length !== 2) return null;
  const h = Number(parts[0]);
  const a = Number(parts[1]);
  if (Number.isNaN(h) || Number.isNaN(a)) return null;
  return [h, a];
}

function isListedHomeWin(h: number, a: number): boolean {
  if (h <= a) return false;
  return CORRECT_SCORE_SCORES.some((s) => {
    const p = parseScore(s);
    return p && p[0] === h && p[1] === a;
  });
}

function isListedAwayWin(h: number, a: number): boolean {
  if (a <= h) return false;
  return CORRECT_SCORE_SCORES.some((s) => {
    const p = parseScore(s);
    return p && p[0] === h && p[1] === a;
  });
}

function isListedDraw(h: number, a: number): boolean {
  if (h !== a) return false;
  return CORRECT_SCORE_SCORES.some((s) => {
    const p = parseScore(s);
    return p && p[0] === h && p[1] === a;
  });
}

export function evaluateCorrectScore(selection: string, homeScore: number, awayScore: number): boolean {
  const key = selection.replace(/\s+/g, "_").toLowerCase();
  const labelKey = Object.entries(CORRECT_SCORE_LABELS).find(
    ([, label]) => label.toLowerCase() === selection.toLowerCase()
  )?.[0];

  const sel = labelKey || key.replace("any_other_home_win", "any_other_home").replace("any_other_away_win", "any_other_away").replace("any_other_draw", "any_other_draw");

  if (sel === "any_other_home") return homeScore > awayScore && !isListedHomeWin(homeScore, awayScore);
  if (sel === "any_other_away") return awayScore > homeScore && !isListedAwayWin(homeScore, awayScore);
  if (sel === "any_other_draw") return homeScore === awayScore && !isListedDraw(homeScore, awayScore);

  const parsed = parseScore(sel.includes("-") ? sel : selection);
  if (!parsed) return false;
  return parsed[0] === homeScore && parsed[1] === awayScore;
}

export function evaluateMatchResult(
  selection: string,
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number
): boolean {
  const sel = selection.toLowerCase();
  const home = homeTeam.toLowerCase();
  const away = awayTeam.toLowerCase();
  if (sel === "draw" || sel === "x") return homeScore === awayScore;
  if (sel.includes(home) || sel === "home" || sel === "1") return homeScore > awayScore;
  if (sel.includes(away) || sel === "away" || sel === "2") return awayScore > homeScore;
  return false;
}

export function evaluateOverUnder(
  selection: string,
  line: number,
  homeScore: number,
  awayScore: number
): boolean {
  const total = homeScore + awayScore;
  const sel = selection.toLowerCase();
  if (sel.startsWith("over") || sel === "over") return total > line;
  if (sel.startsWith("under") || sel === "under") return total < line;
  return false;
}

export function evaluateBtts(selection: string, homeScore: number, awayScore: number): boolean {
  const both = homeScore > 0 && awayScore > 0;
  const sel = selection.toLowerCase();
  if (sel === "yes" || sel === "btts yes") return both;
  if (sel === "no" || sel === "btts no") return !both;
  return false;
}

export function evaluateDoubleChance(
  selection: string,
  homeScore: number,
  awayScore: number
): boolean {
  const sel = selection.toLowerCase().replace(/\s/g, "");
  if (sel === "1x" || sel === "home_draw" || sel === "homedraw") {
    return homeScore >= awayScore;
  }
  if (sel === "12" || sel === "home_away" || sel === "homeaway") {
    return homeScore !== awayScore;
  }
  if (sel === "x2" || sel === "draw_away" || sel === "drawaway") {
    return homeScore <= awayScore;
  }
  return false;
}

export function evaluateSelection(
  market: string,
  selection: string,
  match: { home_team: string; away_team: string; home_score: number; away_score: number; over_under_line?: number }
): boolean {
  const m = market.toLowerCase();
  const hs = match.home_score;
  const as = match.away_score;

  if (m.includes("correct score")) {
    return evaluateCorrectScore(selection, hs, as);
  }
  if (m.includes("double chance")) {
    return evaluateDoubleChance(selection, hs, as);
  }
  if (m.includes("both teams") || m === "btts") {
    return evaluateBtts(selection, hs, as);
  }
  if (m.includes("over") || m.includes("under") || m.includes("o/u")) {
    const line = match.over_under_line ?? 2.5;
    return evaluateOverUnder(selection, Number(line), hs, as);
  }
  return evaluateMatchResult(selection, match.home_team, match.away_team, hs, as);
}
