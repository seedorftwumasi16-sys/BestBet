import { getDb } from "../db";
import { boolVal } from "../db/helpers";
import { emitMatchChange, getMatchById } from "./matches";
import { shouldAutoTickMatch } from "./match-timer";

const GOAL_CHANCE_PER_TICK = 0.04;

/** Random goal events for live simulated matches (runs only after kickoff). */
export async function tickSimulatedMatchScores(): Promise<number> {
  const db = await getDb();
  const result = await db.query(
    `SELECT * FROM matches
     WHERE COALESCE(is_simulated, FALSE) = TRUE
     AND (LOWER(COALESCE(match_status, '')) = 'live' OR is_live = TRUE)
     AND LOWER(COALESCE(match_status, '')) != 'finished'`
  );

  let updated = 0;

  for (const row of result.rows) {
    if (!shouldAutoTickMatch(row)) continue;
    if (Math.random() > GOAL_CHANCE_PER_TICK) continue;

    const homeGoal = Math.random() < 0.52;
    const homeScore = Number(row.home_score ?? 0) + (homeGoal ? 1 : 0);
    const awayScore = Number(row.away_score ?? 0) + (homeGoal ? 0 : 1);

    await db.query(`UPDATE matches SET home_score = ?, away_score = ? WHERE id = ?`, [
      homeScore,
      awayScore,
      row.id,
    ]);

    const payload = await getMatchById(String(row.id));
    if (payload) await emitMatchChange("updated", payload);
    updated += 1;
  }

  return updated;
}

/** Resume second half for simulated matches stuck at HT when timer advances. */
export async function resumeSimulatedSecondHalves(): Promise<number> {
  const db = await getDb();
  const result = await db.query(
    `SELECT * FROM matches
     WHERE COALESCE(is_simulated, FALSE) = TRUE
     AND (timer_paused = TRUE OR live_minute = 45)
     AND LOWER(COALESCE(match_status, '')) = 'live'`
  );

  let resumed = 0;
  const nowIso = new Date().toISOString();

  for (const row of result.rows) {
    const tickRaw = row.minute_tick_at ? String(row.minute_tick_at) : "";
    const tickAt = tickRaw ? new Date(tickRaw).getTime() : NaN;
    if (!Number.isFinite(tickAt)) continue;
    const pausedForMs = Date.now() - tickAt;
    if (pausedForMs < 15_000) continue;

    await db.query(
      `UPDATE matches SET live_minute = ?, timer_paused = ?, minute_tick_at = ?, live_status_short = ? WHERE id = ?`,
      [46, boolVal(db, false), nowIso, "2H", row.id]
    );

    const payload = await getMatchById(String(row.id));
    if (payload) await emitMatchChange("updated", payload);
    resumed += 1;
  }

  return resumed;
}
