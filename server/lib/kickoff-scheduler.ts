import { getDb } from "../db";
import { boolFrom } from "../db/helpers";
import { emitMatchChange, getMatchById, invalidateMatchCache, syncLiveFields } from "./matches";
import { finishMatchAtFullTime } from "./match-timer";

const MATCH_DURATION_MS = 105 * 60 * 1000;

function parseKickoff(row: Record<string, unknown>): number {
  const raw = String(row.start_time ?? "");
  const ts = new Date(raw).getTime();
  return Number.isFinite(ts) ? ts : NaN;
}

function isRealAutoMatch(row: Record<string, unknown>): boolean {
  return !boolFrom(row, "is_simulated") && !boolFrom(row, "status_override");
}

export async function promoteKickoffMatches(): Promise<{ promoted: number; finished: number }> {
  const db = await getDb();
  const now = new Date();
  const nowIso = now.toISOString();
  let promoted = 0;
  let finished = 0;

  const upcoming = await db.query(`SELECT * FROM matches WHERE LOWER(COALESCE(match_status, '')) = 'upcoming'`);
  for (const row of upcoming.rows) {
    if (!isRealAutoMatch(row)) continue;
    const kickoff = parseKickoff(row);
    if (!Number.isFinite(kickoff) || kickoff > now.getTime()) continue;

    const live = syncLiveFields("live");
    await db.query(
      `UPDATE matches SET is_live = ?, match_status = ?, live_minute = ?, minute_tick_at = ?, timer_paused = ?, home_score = COALESCE(home_score, 0), away_score = COALESCE(away_score, 0) WHERE id = ?`,
      [live.is_live, live.match_status, 0, nowIso, false, row.id]
    );

    const payload = await getMatchById(String(row.id));
    await emitMatchChange("updated", payload);
    console.log(
      `[kickoff] Promoted ${row.id} (${row.home_team} vs ${row.away_team}) to LIVE — kickoff ${row.start_time}`
    );
    promoted += 1;
  }

  const liveRows = await db.query(
    `SELECT * FROM matches WHERE LOWER(COALESCE(match_status, '')) = 'live' OR is_live = TRUE`
  );
  for (const row of liveRows.rows) {
    if (!isRealAutoMatch(row)) continue;
    const kickoff = parseKickoff(row);
    if (!Number.isFinite(kickoff)) continue;
    if (kickoff + MATCH_DURATION_MS > now.getTime()) continue;

    await finishMatchAtFullTime(String(row.id));
    console.log(
      `[kickoff] Finished ${row.id} (${row.home_team} vs ${row.away_team}) — full time after kickoff ${row.start_time}`
    );
    finished += 1;
  }

  if (promoted > 0 || finished > 0) {
    await invalidateMatchCache();
  }

  return { promoted, finished };
}
