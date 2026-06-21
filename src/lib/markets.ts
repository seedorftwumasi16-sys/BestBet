export const CORRECT_SCORE_SCORES = [
  "0-0", "1-0", "2-0", "2-1", "3-0", "3-1", "3-2", "4-0", "4-1", "4-2", "4-3",
  "0-1", "0-2", "1-2", "1-3", "2-3", "0-3",
] as const;

export const CORRECT_SCORE_SPECIALS = ["any_other_home", "any_other_away", "any_other_draw"] as const;

export const CORRECT_SCORE_LABELS: Record<string, string> = {
  "0-0": "0-0", "1-0": "1-0", "2-0": "2-0", "2-1": "2-1", "3-0": "3-0", "3-1": "3-1",
  "3-2": "3-2", "4-0": "4-0", "4-1": "4-1", "4-2": "4-2", "4-3": "4-3",
  "0-1": "0-1", "0-2": "0-2", "1-2": "1-2", "1-3": "1-3", "2-3": "2-3", "0-3": "0-3",
  any_other_home: "Any Other Home Win",
  any_other_away: "Any Other Away Win",
  any_other_draw: "Any Other Draw",
};

export const DOUBLE_CHANCE_LABELS: Record<string, string> = {
  home_draw: "1X",
  home_away: "12",
  draw_away: "X2",
};

export const MARKET_TABS = ["main", "over_under", "btts", "double_chance", "correct_score"] as const;

export type MarketTab = (typeof MARKET_TABS)[number];

export const MARKET_TAB_LABELS: Record<MarketTab, string> = {
  main: "Main Markets",
  over_under: "Over/Under",
  btts: "Both Teams To Score",
  double_chance: "Double Chance",
  correct_score: "Correct Score",
};
