import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db";
import type { MatchInput } from "./matches";
import {
  CORRECT_SCORE_SCORES,
  CORRECT_SCORE_SPECIALS,
  defaultCorrectScoreOdds,
  defaultDoubleChanceOdds,
} from "./markets";

interface OddsRow {
  market: string;
  selection: string;
  odds_value: number;
}

function buildOddsRows(
  input: Partial<MatchInput>,
  row?: Record<string, unknown>,
  existingCorrect?: Record<string, number>,
  existingDouble?: Record<string, number>
): OddsRow[] {
  const home = input.oddsHome ?? row?.odds_home;
  const draw = input.oddsDraw !== undefined ? input.oddsDraw : row?.odds_draw;
  const away = input.oddsAway ?? row?.odds_away;
  const over = input.oddsOver !== undefined ? input.oddsOver : row?.odds_over;
  const under = input.oddsUnder !== undefined ? input.oddsUnder : row?.odds_under;
  const bttsYes = input.oddsBttsYes !== undefined ? input.oddsBttsYes : row?.odds_btts_yes;
  const bttsNo = input.oddsBttsNo !== undefined ? input.oddsBttsNo : row?.odds_btts_no;
  const line = input.overUnderLine ?? row?.over_under_line ?? 2.5;

  const rows: OddsRow[] = [];
  if (home != null) rows.push({ market: "1x2", selection: "home", odds_value: Number(home) });
  if (draw != null) rows.push({ market: "1x2", selection: "draw", odds_value: Number(draw) });
  if (away != null) rows.push({ market: "1x2", selection: "away", odds_value: Number(away) });
  if (over != null) rows.push({ market: "over_under", selection: `over_${line}`, odds_value: Number(over) });
  if (under != null) rows.push({ market: "over_under", selection: `under_${line}`, odds_value: Number(under) });
  if (bttsYes != null) rows.push({ market: "btts", selection: "yes", odds_value: Number(bttsYes) });
  if (bttsNo != null) rows.push({ market: "btts", selection: "no", odds_value: Number(bttsNo) });

  const correctScore = input.correctScoreOdds ?? existingCorrect;
  if (correctScore) {
    for (const [selection, value] of Object.entries(correctScore)) {
      if (value != null && Number(value) > 0) {
        rows.push({ market: "correct_score", selection, odds_value: Number(value) });
      }
    }
  }

  const doubleChance = input.doubleChanceOdds ?? existingDouble;
  if (doubleChance) {
    for (const [selection, value] of Object.entries(doubleChance)) {
      if (value != null && Number(value) > 0) {
        rows.push({ market: "double_chance", selection, odds_value: Number(value) });
      }
    }
  }

  return rows;
}

export async function getOddsForMatch(matchId: string) {
  const db = await getDb();
  const result = await db.query(`SELECT market, selection, odds_value FROM odds WHERE match_id = ?`, [matchId]);

  const correctScore: Record<string, number> = {};
  const doubleChance: Record<string, number> = {};

  for (const row of result.rows) {
    const market = String(row.market);
    const selection = String(row.selection);
    const value = Number(row.odds_value);
    if (market === "correct_score") correctScore[selection] = value;
    if (market === "double_chance") doubleChance[selection] = value;
  }

  return { correctScore, doubleChance };
}

export async function seedDefaultFootballOdds(
  matchId: string,
  oddsHome: number,
  oddsDraw: number | null,
  oddsAway: number
) {
  const correctScore = defaultCorrectScoreOdds();
  const doubleChance = defaultDoubleChanceOdds(oddsHome, oddsDraw ?? 3.2, oddsAway);
  await syncOddsForMatch(matchId, { correctScoreOdds: correctScore, doubleChanceOdds: doubleChance });
}

export async function syncOddsForMatch(
  matchId: string,
  input: Partial<MatchInput>,
  existingRow?: Record<string, unknown>
): Promise<void> {
  const db = await getDb();
  const existing = await getOddsForMatch(matchId);
  const rows = buildOddsRows(input, existingRow, existing.correctScore, existing.doubleChance);

  await db.query(`DELETE FROM odds WHERE match_id = ?`, [matchId]);

  const seen = new Set<string>();
  for (const row of rows) {
    const key = `${row.market}:${row.selection}`;
    if (seen.has(key)) continue;
    seen.add(key);
    await db.query(
      `INSERT INTO odds (id, match_id, market, selection, odds_value) VALUES (?, ?, ?, ?, ?)`,
      [uuidv4(), matchId, row.market, row.selection, row.odds_value]
    );
  }
}

export async function syncCorrectScoreOdds(matchId: string, correctScoreOdds: Record<string, number>) {
  const db = await getDb();
  await db.query(`DELETE FROM odds WHERE match_id = ? AND market = 'correct_score'`, [matchId]);
  for (const [selection, value] of Object.entries(correctScoreOdds)) {
    if (value > 0) {
      await db.query(
        `INSERT INTO odds (id, match_id, market, selection, odds_value) VALUES (?, ?, ?, ?, ?)`,
        [uuidv4(), matchId, "correct_score", selection, value]
      );
    }
  }
}

export async function deleteOddsForMatch(matchId: string): Promise<void> {
  const db = await getDb();
  await db.query(`DELETE FROM odds WHERE match_id = ?`, [matchId]);
}

export function buildDefaultCorrectScoreForSport(sport: string, home: number, draw: number | null, away: number) {
  if (sport !== "football") return {};
  return {
    correctScoreOdds: defaultCorrectScoreOdds(),
    doubleChanceOdds: defaultDoubleChanceOdds(home, draw ?? 3.2, away),
  };
}

export const ALL_CORRECT_SCORE_KEYS = [...CORRECT_SCORE_SCORES, ...CORRECT_SCORE_SPECIALS];
