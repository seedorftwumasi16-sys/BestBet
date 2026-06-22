import { getDb } from "../db";
import { boolFrom, boolVal } from "../db/helpers";
import { ensureMatchSchema } from "../db/schema-verify";
import { emitMatchChange, getMatchById, invalidateMatchCache, syncLiveFields } from "./matches";
import { buildTimerFieldsForStatus, getMatchDurationMinutes } from "./match-timer";

function parseKickoff(row: Record<string, unknown>): number {
  const raw = String(row.start_time ?? "");
  const ts = new Date(raw).getTime();
  return Number.isFinite(ts) ? ts : NaN;
}

function isScheduledRow(row: Record<string, unknown>): boolean {
  const status = String(row.match_status || "upcoming").toLowerCase();
  if (status === "live" || status === "finished") return false;
  if (boolFrom(row, "is_live")) return false;
  return true;
}

/** Admin-created and simulated fixtures auto-start at kickoff when enabled. API fixtures use API status. */
export function shouldAutoStartMatch(row: Record<string, unknown>): boolean {
  if (row.apifootball_fixture_id) return false;
  if (row.auto_start != null && !boolFrom(row, "auto_start")) return false;
  return true;
}

async function promoteRowToLive(row: Record<string, unknown>): Promise<void> {
  const db = await getDb();
  const nowIso = new Date().toISOString();
  const fullTime = getMatchDurationMinutes(row);
  const timerInit = buildTimerFieldsForStatus("live", { minuteInput: 0, durationMinutes: fullTime });
  const live = syncLiveFields("live");
  const liveShort = boolFrom(row, "is_simulated") ? "1H" : "LIVE";

  await db.query(
    `UPDATE matches SET
      is_live = ?,
      match_status = ?,
      live_minute = ?,
      minute_tick_at = ?,
      timer_paused = ?,
      status_override = ?,
      live_status_short = ?,
      home_score = COALESCE(home_score, 0),
      away_score = COALESCE(away_score, 0)
     WHERE id = ?`,
    [
      boolVal(db, live.is_live),
      live.match_status,
      timerInit.liveMinute,
      timerInit.minuteTickAt ?? nowIso,
      boolVal(db, timerInit.timerPaused),
      boolVal(db, true),
      liveShort,
      row.id,
    ]
  );

  const payload = await getMatchById(String(row.id));
  if (payload) await emitMatchChange("updated", payload);
}

/** Promote a single match if kickoff time has passed. */
export async function promoteMatchIfDue(matchId: string): Promise<boolean> {
  const db = await getDb();
  await ensureMatchSchema(db);

  const result = await db.query(`SELECT * FROM matches WHERE id = ?`, [matchId]);
  if (result.rows.length === 0) return false;

  const row = result.rows[0];
  if (!isScheduledRow(row) || !shouldAutoStartMatch(row)) return false;

  const kickoff = parseKickoff(row);
  if (!Number.isFinite(kickoff) || kickoff > Date.now()) return false;

  await promoteRowToLive(row);
  await invalidateMatchCache();
  console.log(
    `[kickoff] Auto-started ${row.id} (${row.home_team} vs ${row.away_team}) — kickoff ${row.start_time}`
  );
  return true;
}

export async function promoteKickoffMatches(): Promise<{ promoted: number }> {
  const db = await getDb();
  await ensureMatchSchema(db);

  const now = Date.now();
  let promoted = 0;

  const upcoming = await db.query(
    `SELECT * FROM matches
     WHERE COALESCE(is_live, FALSE) = FALSE
     AND LOWER(COALESCE(match_status, 'upcoming')) NOT IN ('live', 'finished')
     AND (apifootball_fixture_id IS NULL OR apifootball_fixture_id = '')`
  );

  for (const row of upcoming.rows) {
    if (!isScheduledRow(row) || !shouldAutoStartMatch(row)) continue;

    const kickoff = parseKickoff(row);
    if (!Number.isFinite(kickoff) || kickoff > now) continue;

    await promoteRowToLive(row);
    console.log(
      `[kickoff] Auto-started ${row.id} (${row.home_team} vs ${row.away_team}) — kickoff ${row.start_time}`
    );
    promoted += 1;
  }

  if (promoted > 0) {
    await invalidateMatchCache();
  }

  return { promoted };
}
