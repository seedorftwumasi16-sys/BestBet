import { getDb } from "../db";
import { boolFrom, boolVal } from "../db/helpers";
import { settleMatchBets } from "./settlement";

export const FULL_TIME_MINUTE = 90;
export const HALFTIME_MINUTE = 45;

export function isMatchLiveFromRow(row: Record<string, unknown>): boolean {
  const status = String(row.match_status || "").toLowerCase();
  if (status === "finished") return false;
  if (status === "live") return true;
  if (boolFrom(row, "status_override") && boolFrom(row, "is_live")) return true;
  return boolFrom(row, "is_live");
}

/** Admin-controlled and simulated fixtures use the server timer. */
export function shouldAutoTickMatch(row: Record<string, unknown>): boolean {
  if (!isMatchLiveFromRow(row)) return false;
  return boolFrom(row, "status_override") || boolFrom(row, "is_simulated");
}

export function resolveTimerFields(
  minute: number,
  options?: { resetTick?: boolean; goingLive?: boolean }
): { liveMinute: number; timerPaused: boolean; minuteTickAt: string | null } {
  const liveMinute = Math.max(0, Math.min(FULL_TIME_MINUTE, Math.floor(Number(minute) || 0)));
  const timerPaused = liveMinute === HALFTIME_MINUTE;
  const resetTick = options?.resetTick !== false;
  return {
    liveMinute,
    timerPaused,
    minuteTickAt: resetTick && !timerPaused ? new Date().toISOString() : null,
  };
}

export function computeEffectiveLiveMinute(row: Record<string, unknown>): {
  minute: number;
  display: string;
  paused: boolean;
} {
  const stored = Math.max(0, Number(row.live_minute ?? 0));
  const paused = boolFrom(row, "timer_paused");
  const live = isMatchLiveFromRow(row);

  if (!live) {
    const status = String(row.match_status || "").toLowerCase();
    if (status === "finished") {
      return { minute: stored || FULL_TIME_MINUTE, display: "FT", paused: false };
    }
    return { minute: stored, display: formatMinuteLabel(stored, false), paused: false };
  }

  if (paused || stored === HALFTIME_MINUTE) {
    return { minute: HALFTIME_MINUTE, display: "HT", paused: true };
  }

  if (!shouldAutoTickMatch(row)) {
    return { minute: stored, display: formatMinuteLabel(stored, false), paused: false };
  }

  const tickRaw = row.minute_tick_at ? String(row.minute_tick_at) : "";
  const tickAt = tickRaw ? new Date(tickRaw).getTime() : NaN;
  if (!Number.isFinite(tickAt)) {
    return { minute: stored, display: formatMinuteLabel(stored, false), paused: false };
  }

  const elapsed = Math.floor((Date.now() - tickAt) / 60_000);
  let minute = Math.min(FULL_TIME_MINUTE, stored + Math.max(0, elapsed));

  if (minute >= HALFTIME_MINUTE && stored < HALFTIME_MINUTE) {
    return { minute: HALFTIME_MINUTE, display: "HT", paused: true };
  }

  if (minute >= FULL_TIME_MINUTE) {
    minute = FULL_TIME_MINUTE;
  }

  return { minute, display: formatMinuteLabel(minute, false), paused: false };
}

export function formatMinuteLabel(minute: number, paused: boolean): string {
  if (paused || minute === HALFTIME_MINUTE) return "HT";
  if (minute >= FULL_TIME_MINUTE) return "FT";
  return `${minute}'`;
}

async function emitMatchUpdated(matchId: string): Promise<void> {
  const { getMatchById, emitMatchChange } = await import("./matches");
  const payload = await getMatchById(matchId);
  if (payload) await emitMatchChange("updated", payload);
}

export async function finishMatchAtFullTime(matchId: string): Promise<void> {
  const db = await getDb();
  const existing = await db.query(`SELECT * FROM matches WHERE id = ?`, [matchId]);
  if (existing.rows.length === 0) return;

  const row = existing.rows[0];
  if (String(row.match_status || "").toLowerCase() === "finished") return;

  await db.query(
    `UPDATE matches SET
      live_minute = ?,
      match_status = ?,
      is_live = ?,
      betting_suspended = ?,
      timer_paused = ?,
      minute_tick_at = NULL
     WHERE id = ?`,
    [FULL_TIME_MINUTE, "finished", boolVal(db, false), boolVal(db, true), boolVal(db, false), matchId]
  );

  await settleMatchBets(matchId);
  await emitMatchUpdated(matchId);
  console.log(`[match-timer] Match ${matchId} finished at ${FULL_TIME_MINUTE}'`);
}

async function persistMinute(
  matchId: string,
  minute: number,
  timerPaused: boolean,
  resetTick: boolean
): Promise<void> {
  const db = await getDb();
  const tickAt = resetTick && !timerPaused ? new Date().toISOString() : null;

  if (tickAt) {
    await db.query(
      `UPDATE matches SET live_minute = ?, timer_paused = ?, minute_tick_at = ? WHERE id = ?`,
      [minute, boolVal(db, timerPaused), tickAt, matchId]
    );
  } else {
    await db.query(`UPDATE matches SET live_minute = ?, timer_paused = ? WHERE id = ?`, [
      minute,
      boolVal(db, timerPaused),
      matchId,
    ]);
  }

  await emitMatchUpdated(matchId);
}

export async function tickLiveMatchTimers(): Promise<number> {
  const db = await getDb();
  const result = await db.query(
    `SELECT * FROM matches
     WHERE (LOWER(COALESCE(match_status, '')) = 'live' OR is_live = TRUE)
     AND (status_override = TRUE OR is_simulated = TRUE)
     AND COALESCE(timer_paused, FALSE) = FALSE`
  );

  let updated = 0;

  for (const row of result.rows) {
    if (!shouldAutoTickMatch(row)) continue;

    const tickRaw = row.minute_tick_at ? String(row.minute_tick_at) : "";
    const tickAt = tickRaw ? new Date(tickRaw).getTime() : NaN;
    if (!Number.isFinite(tickAt)) {
      await db.query(`UPDATE matches SET minute_tick_at = ? WHERE id = ?`, [
        new Date().toISOString(),
        row.id,
      ]);
      continue;
    }

    const elapsedMinutes = Math.floor((Date.now() - tickAt) / 60_000);
    if (elapsedMinutes < 1) continue;

    const current = Math.max(0, Number(row.live_minute ?? 0));
    let next = current + elapsedMinutes;

    if (next >= FULL_TIME_MINUTE) {
      await finishMatchAtFullTime(String(row.id));
      updated += 1;
      continue;
    }

    if (next >= HALFTIME_MINUTE && current < HALFTIME_MINUTE) {
      await persistMinute(String(row.id), HALFTIME_MINUTE, true, false);
      console.log(`[match-timer] ${row.id} reached HT at ${HALFTIME_MINUTE}'`);
      updated += 1;
      continue;
    }

    await persistMinute(String(row.id), next, false, true);
    console.log(`[match-timer] ${row.id} advanced to ${next}'`);
    updated += 1;
  }

  return updated;
}

export async function syncComputedHalftimeStates(): Promise<void> {
  const db = await getDb();
  const result = await db.query(
    `SELECT * FROM matches
     WHERE (LOWER(COALESCE(match_status, '')) = 'live' OR is_live = TRUE)
     AND COALESCE(timer_paused, FALSE) = FALSE
     AND (status_override = TRUE OR is_simulated = TRUE)`
  );

  for (const row of result.rows) {
    const computed = computeEffectiveLiveMinute(row);
    if (computed.paused && !boolFrom(row, "timer_paused")) {
      await persistMinute(String(row.id), HALFTIME_MINUTE, true, false);
    }
    if (computed.minute >= FULL_TIME_MINUTE && isMatchLiveFromRow(row)) {
      await finishMatchAtFullTime(String(row.id));
    }
  }
}

export function timerFieldsForStatusChange(
  status: "upcoming" | "live" | "finished",
  minuteInput: number | undefined,
  existingMinute: number | null | undefined
): { liveMinute?: number; timerPaused?: boolean; minuteTickAt?: string | null } {
  if (status === "finished") {
    return { liveMinute: FULL_TIME_MINUTE, timerPaused: false, minuteTickAt: null };
  }

  if (status !== "live") {
    return { minuteTickAt: null, timerPaused: false };
  }

  const minute = minuteInput !== undefined ? minuteInput : Math.max(0, Number(existingMinute ?? 0));
  const resolved = resolveTimerFields(minute, { resetTick: true, goingLive: true });
  return {
    liveMinute: resolved.liveMinute,
    timerPaused: resolved.timerPaused,
    minuteTickAt: resolved.minuteTickAt,
  };
}
