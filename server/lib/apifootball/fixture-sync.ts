import { getDb } from "../../db";
import { boolFrom, boolVal } from "../../db/helpers";
import {
  emitMatchChange,
  getMatchById,
  invalidateMatchCache,
  normalizeMatchStatus,
  syncLiveFields,
  type MatchStatus,
} from "../matches";
import { finishMatchAtFullTime } from "../match-timer";
import { buildDefaultCorrectScoreForSport, syncOddsForMatch } from "../odds";
import type { ApiFootballFixture } from "./client";
import { API_FOOTBALL_LEAGUE_IDS } from "./leagues";

const LIVE_SHORT = new Set(["1H", "2H", "HT", "ET", "P", "BT", "LIVE", "INT"]);
const FINISHED_SHORT = new Set(["FT", "AET", "PEN"]);

export function apiFootballMatchId(fixtureId: number): string {
  return `af-${fixtureId}`;
}

export function mapApiStatus(short: string): MatchStatus {
  const s = short.toUpperCase();
  if (LIVE_SHORT.has(s)) return "live";
  if (FINISHED_SHORT.has(s)) return "finished";
  return "upcoming";
}

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

function defaultOdds(home: string, away: string) {
  const seed = (home.length + away.length) % 7;
  return {
    home: +(1.55 + seed * 0.12).toFixed(2),
    draw: +(3.1 + (seed % 3) * 0.15).toFixed(2),
    away: +(1.75 + ((seed + 2) % 5) * 0.14).toFixed(2),
  };
}

async function findExistingMatch(db: Awaited<ReturnType<typeof getDb>>, fx: ApiFootballFixture) {
  const byFixture = await db.query(
    `SELECT * FROM matches WHERE apifootball_fixture_id = ? OR id = ? LIMIT 1`,
    [String(fx.fixtureId), apiFootballMatchId(fx.fixtureId)]
  );
  if (byFixture.rows.length > 0) return byFixture.rows[0];

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

export async function upsertApiFootballFixture(
  db: Awaited<ReturnType<typeof getDb>>,
  fx: ApiFootballFixture,
  options?: { fetchCards?: boolean; apiKey?: string }
): Promise<{ action: "created" | "updated" | "finished" | "skipped"; matchId?: string }> {
  if (!API_FOOTBALL_LEAGUE_IDS.includes(fx.leagueId)) {
    return { action: "skipped" };
  }

  const existing = await findExistingMatch(db, fx);
  const matchId = existing ? String(existing.id) : apiFootballMatchId(fx.fixtureId);
  const status = mapApiStatus(fx.status.short);
  const live = syncLiveFields(status);
  const homeScore = fx.homeGoals ?? (status === "live" || status === "finished" ? 0 : null);
  const awayScore = fx.awayGoals ?? (status === "live" || status === "finished" ? 0 : null);
  const elapsed = fx.status.elapsed ?? (status === "live" ? 0 : null);
  const timerPaused = fx.status.short.toUpperCase() === "HT";
  const nowIso = new Date().toISOString();
  const odds = defaultOdds(fx.homeTeam, fx.awayTeam);

  if (existing && boolFrom(existing, "status_override") && boolFrom(existing, "is_simulated")) {
    return { action: "skipped", matchId };
  }

  if (!existing) {
    const csDefaults = buildDefaultCorrectScoreForSport("football", odds.home, odds.draw, odds.away);
    await db.query(
      `INSERT INTO matches (
        id, apifootball_fixture_id, home_team, away_team, league, sport, start_time,
        is_live, match_status, is_featured, betting_suspended, is_simulated, status_override, created_at,
        odds_home, odds_draw, odds_away, odds_over, odds_under, odds_btts_yes, odds_btts_no, over_under_line,
        home_score, away_score, live_minute, timer_paused, minute_tick_at,
        home_team_logo, away_team_logo, league_badge,
        live_status_short, live_data_available
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        matchId,
        String(fx.fixtureId),
        fx.homeTeam,
        fx.awayTeam,
        fx.league,
        "football",
        fx.date,
        boolVal(db, live.is_live),
        live.match_status,
        boolVal(db, false),
        boolVal(db, status === "finished"),
        boolVal(db, false),
        boolVal(db, false),
        nowIso,
        odds.home,
        odds.draw,
        odds.away,
        1.85,
        1.95,
        1.72,
        2.05,
        2.5,
        homeScore,
        awayScore,
        elapsed ?? 0,
        boolVal(db, timerPaused),
        status === "live" && !timerPaused ? nowIso : null,
        fx.homeLogo,
        fx.awayLogo,
        fx.leagueLogo,
        fx.status.short,
        boolVal(db, true),
      ]
    );

    await syncOddsForMatch(matchId, {
      oddsHome: odds.home,
      oddsDraw: odds.draw,
      oddsAway: odds.away,
      correctScoreOdds: csDefaults.correctScoreOdds,
      doubleChanceOdds: csDefaults.doubleChanceOdds,
    });

    const payload = await getMatchById(matchId);
    if (payload) await emitMatchChange("created", payload);
    return { action: "created", matchId };
  }

  let homeYellow = Number(existing.home_yellow_cards ?? 0);
  let awayYellow = Number(existing.away_yellow_cards ?? 0);
  let homeRed = Number(existing.home_red_cards ?? 0);
  let awayRed = Number(existing.away_red_cards ?? 0);

  if (options?.fetchCards && options.apiKey && status === "live") {
    const { fetchFixtureCardCounts } = await import("./client");
    const cards = await fetchFixtureCardCounts(options.apiKey, fx.fixtureId, fx.homeTeam, fx.awayTeam);
    homeYellow = cards.homeYellow;
    awayYellow = cards.awayYellow;
    homeRed = cards.homeRed;
    awayRed = cards.awayRed;
  }

  await db.query(
    `UPDATE matches SET
      apifootball_fixture_id = ?,
      home_team = ?, away_team = ?, league = ?, start_time = ?,
      home_score = ?, away_score = ?, live_minute = ?,
      match_status = ?, is_live = ?, timer_paused = ?,
      minute_tick_at = CASE WHEN ? = TRUE AND timer_paused = FALSE THEN COALESCE(minute_tick_at, ?) ELSE minute_tick_at END,
      home_team_logo = COALESCE(?, home_team_logo),
      away_team_logo = COALESCE(?, away_team_logo),
      league_badge = COALESCE(?, league_badge),
      live_status_short = ?,
      home_yellow_cards = ?, away_yellow_cards = ?, home_red_cards = ?, away_red_cards = ?,
      live_data_available = ?, live_data_error = NULL,
      betting_suspended = ?
     WHERE id = ?`,
    [
      String(fx.fixtureId),
      fx.homeTeam,
      fx.awayTeam,
      fx.league,
      fx.date,
      homeScore,
      awayScore,
      elapsed ?? Number(existing.live_minute ?? 0),
      live.match_status,
      boolVal(db, live.is_live),
      boolVal(db, timerPaused),
      boolVal(db, status === "live"),
      nowIso,
      fx.homeLogo,
      fx.awayLogo,
      fx.leagueLogo,
      fx.status.short,
      homeYellow,
      awayYellow,
      homeRed,
      awayRed,
      boolVal(db, true),
      boolVal(db, status === "finished"),
      matchId,
    ]
  );

  if (status === "finished" && normalizeMatchStatus(existing) !== "finished") {
    await finishMatchAtFullTime(matchId);
    return { action: "finished", matchId };
  }

  const payload = await getMatchById(matchId);
  if (payload) await emitMatchChange("updated", payload);
  return { action: "updated", matchId };
}

export async function syncApiFootballFixtures(
  apiKey: string,
  dates: string[]
): Promise<{ imported: number; updated: number; finished: number }> {
  const db = await getDb();
  let imported = 0;
  let updated = 0;
  let finished = 0;

  const seen = new Set<number>();

  for (const date of dates) {
    const { fetchFixturesByDate } = await import("./client");
    let fixtures: ApiFootballFixture[] = [];
    try {
      fixtures = await fetchFixturesByDate(apiKey, date);
    } catch (err) {
      console.warn(`[apifootball] fixtures date=${date} failed:`, err instanceof Error ? err.message : err);
      continue;
    }

    for (const fx of fixtures) {
      if (seen.has(fx.fixtureId)) continue;
      seen.add(fx.fixtureId);

      const result = await upsertApiFootballFixture(db, fx);
      if (result.action === "created") imported += 1;
      if (result.action === "updated") updated += 1;
      if (result.action === "finished") finished += 1;
    }
  }

  if (imported > 0 || updated > 0 || finished > 0) {
    await invalidateMatchCache();
  }

  return { imported, updated, finished };
}
