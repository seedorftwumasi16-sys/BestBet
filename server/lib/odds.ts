import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db";
import type { MatchInput } from "./matches";

interface OddsRow {
  market: string;
  selection: string;
  odds_value: number;
}

function buildOddsRows(matchId: string, input: Partial<MatchInput>, row?: Record<string, unknown>): OddsRow[] {
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
  return rows;
}

export async function syncOddsForMatch(
  matchId: string,
  input: Partial<MatchInput>,
  existingRow?: Record<string, unknown>
): Promise<void> {
  const db = await getDb();
  const rows = buildOddsRows(matchId, input, existingRow);

  await db.query(`DELETE FROM odds WHERE match_id = ?`, [matchId]);

  for (const row of rows) {
    await db.query(
      `INSERT INTO odds (id, match_id, market, selection, odds_value) VALUES (?, ?, ?, ?, ?)`,
      [uuidv4(), matchId, row.market, row.selection, row.odds_value]
    );
  }
}

export async function deleteOddsForMatch(matchId: string): Promise<void> {
  const db = await getDb();
  await db.query(`DELETE FROM odds WHERE match_id = ?`, [matchId]);
}
