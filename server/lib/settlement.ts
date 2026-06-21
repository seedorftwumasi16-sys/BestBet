import { getDb, getWalletBalance } from "../db";
import { boolFrom } from "../db/helpers";
import { evaluateSelection } from "./markets";
import { createNotification } from "../services/notifications";
import { logAudit } from "../middleware/auth";

export async function settleMatchBets(matchId: string): Promise<{ settled: number; won: number; lost: number }> {
  const db = await getDb();
  const matchResult = await db.query(`SELECT * FROM matches WHERE id = ?`, [matchId]);
  if (matchResult.rows.length === 0) return { settled: 0, won: 0, lost: 0 };

  const match = matchResult.rows[0];
  const status = String(match.match_status || "").toLowerCase();
  if (status !== "finished") return { settled: 0, won: 0, lost: 0 };

  const homeScore = Number(match.home_score ?? 0);
  const awayScore = Number(match.away_score ?? 0);

  const betIdsResult = await db.query(
    `SELECT DISTINCT bet_id FROM bet_selections WHERE match_id = ?`,
    [matchId]
  );

  let settled = 0;
  let won = 0;
  let lost = 0;

  for (const row of betIdsResult.rows) {
    const betId = String(row.bet_id);
    const bet = await db.query(`SELECT * FROM bets WHERE id = ?`, [betId]);
    if (bet.rows.length === 0) continue;

    const betRow = bet.rows[0];
    if (betRow.status !== "pending") continue;

    const selections = await db.query(`SELECT * FROM bet_selections WHERE bet_id = ?`, [betId]);
    let allMatchesFinished = true;
    let allLegsWin = true;

    for (const sel of selections.rows) {
      const selMatch = await db.query(`SELECT * FROM matches WHERE id = ?`, [sel.match_id]);
      if (selMatch.rows.length === 0) {
        allMatchesFinished = false;
        break;
      }
      const m = selMatch.rows[0];
      if (String(m.match_status || "").toLowerCase() !== "finished") {
        allMatchesFinished = false;
        break;
      }

      const legWins = evaluateSelection(String(sel.market), String(sel.selection), {
        home_team: String(m.home_team),
        away_team: String(m.away_team),
        home_score: Number(m.home_score ?? 0),
        away_score: Number(m.away_score ?? 0),
        over_under_line: m.over_under_line != null ? Number(m.over_under_line) : 2.5,
      });

      if (!legWins) allLegsWin = false;
    }

    if (!allMatchesFinished) continue;

    settled++;
    const stake = Number(betRow.stake);
    const potentialWin = Number(betRow.potential_win);

    if (allLegsWin) {
      await db.query(`UPDATE bets SET status = 'won', cashout_available = 0 WHERE id = ?`, [betId]);
      await db.query(`UPDATE wallets SET balance = balance + ? WHERE user_id = ?`, [potentialWin, betRow.user_id]);
      await createNotification(
        String(betRow.user_id),
        "Bet Won!",
        `Your bet won GHS ${potentialWin.toFixed(2)}`,
        "success"
      );
      won++;
    } else {
      await db.query(`UPDATE bets SET status = 'lost', cashout_available = 0 WHERE id = ?`, [betId]);
      await createNotification(
        String(betRow.user_id),
        "Bet Lost",
        `Your bet of GHS ${stake.toFixed(2)} did not win`,
        "warning"
      );
      lost++;
    }
  }

  if (settled > 0) {
    await logAudit(null, "settle_match", `Match ${matchId}: ${won} won, ${lost} lost`);
  }

  return { settled, won, lost };
}
