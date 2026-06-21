import { getDb } from "../db";
import { boolFrom, boolVal } from "../db/helpers";
import {
  emitMatchChange,
  getMatchById,
  invalidateMatchCache,
  normalizeMatchStatus,
  syncLiveFields,
  type MatchStatus,
} from "../matches";
import { finishMatchAtFullTime } from "../match-timer";
import { fetchFixtureCardCounts, fetchLiveFixtures, type ApiFootballLiveFixture } from "./client";
import { getApiFootballSettings } from "./settings";

const LIVE_SHORT = new Set(["1H", "2H", "HT", "ET", "P", "BT", "LIVE", "INT"]);
const FINISHED_SHORT = new Set(["FT", "AET", "PEN"]);

function normalizeTeam(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function teamsMatch(dbHome: string, dbAway: string, apiHome: string, apiAway: string): boolean {
  const h = normalizeTeam(dbHome);
  const a = normalizeTeam(dbAway);
  const ah = normalizeTeam(apiHome);
  const aa = normalizeTeam(apiAway);
  return (h.includes(ah) || ah.includes(h)) && (a.includes(aa) || aa.includes(a));
}

function mapApiStatus(short: string): MatchStatus {
  const s = short.toUpperCase();
  if (LIVE_SHORT.has(s)) return "live";
  if (FINISHED_SHORT.has(s)) return "finished";
  return "upcoming";
}

async function findMatchForFixture(db: Awaited<ReturnType<typeof getDb>>, fx: ApiFootballLiveFixture) {
  const byId = await db.query(
    `SELECT * FROM matches WHERE apifootball_fixture_id = ? AND COALESCE(is_simulated, FALSE) = FALSE LIMIT 1`,
    [String(fx.fixtureId)]
  );
  if (byId.rows.length > 0) return byId.rows[0];

  const day = fx.date.slice(0, 10);
  const candidates = await db.query(
    `SELECT * FROM matches WHERE COALESCE(is_simulated, FALSE) = FALSE AND start_time LIKE ?`,
    [`${day}%`]
  );

  for (const row of candidates.rows) {
    if (teamsMatch(String(row.home_team), String(row.away_team), fx.homeTeam, fx.awayTeam)) {
      return row;
    }
  }

  return null;
}

export async function syncApiFootballLiveScores(): Promise<{
  updated: number;
  finished: number;
  unavailable: boolean;
  message?: string;
}> {
  const settings = await getApiFootballSettings();
  if (!settings.enabled) {
    return { updated: 0, finished: 0, unavailable: true, message: "API-Football key not configured" };
  }

  const db = await getDb();
  let updated = 0;
  let finished = 0;

  try {
    const fixtures = await fetchLiveFixtures(settings.apiKey);

    for (const fx of fixtures) {
      const row = await findMatchForFixture(db, fx);
      if (!row) continue;
      if (boolFrom(row, "status_override")) continue;

      const matchId = String(row.id);
      const status = mapApiStatus(fx.status.short);
      const live = syncLiveFields(status);
      const homeScore = fx.homeGoals ?? 0;
      const awayScore = fx.awayGoals ?? 0;
      const elapsed = fx.status.elapsed ?? (status === "live" ? Number(row.live_minute ?? 0) : null);
      const timerPaused = fx.status.short.toUpperCase() === "HT";

      const cards = await fetchFixtureCardCounts(
        settings.apiKey,
        fx.fixtureId,
        fx.homeTeam,
        fx.awayTeam
      );

      await db.query(
        `UPDATE matches SET
          apifootball_fixture_id = ?,
          home_score = ?,
          away_score = ?,
          live_minute = ?,
          match_status = ?,
          is_live = ?,
          timer_paused = ?,
          live_status_short = ?,
          home_yellow_cards = ?,
          away_yellow_cards = ?,
          home_red_cards = ?,
          away_red_cards = ?,
          live_data_available = ?,
          live_data_error = NULL
         WHERE id = ?`,
        [
          String(fx.fixtureId),
          homeScore,
          awayScore,
          elapsed ?? 0,
          live.match_status,
          boolVal(db, live.is_live),
          boolVal(db, timerPaused),
          fx.status.short,
          cards.homeYellow,
          cards.awayYellow,
          cards.homeRed,
          cards.awayRed,
          boolVal(db, true),
          matchId,
        ]
      );

      if (status === "finished" && normalizeMatchStatus(row) !== "finished") {
        await finishMatchAtFullTime(matchId);
        finished += 1;
      } else {
        const payload = await getMatchById(matchId);
        if (payload) await emitMatchChange("updated", payload);
      }

      updated += 1;
    }

    if (updated > 0 || finished > 0) {
      await invalidateMatchCache();
    }

    return { updated, finished, unavailable: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[apifootball] sync failed:", message);

    try {
      await db.query(
        `UPDATE matches SET live_data_available = ?, live_data_error = ?
         WHERE COALESCE(is_simulated, FALSE) = FALSE AND (is_live = TRUE OR LOWER(match_status) = 'live')`,
        [boolVal(db, false), message.slice(0, 240)]
      );
    } catch {
      // ignore
    }

    return { updated: 0, finished: 0, unavailable: true, message };
  }
}
