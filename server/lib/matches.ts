import { getDb } from "../db";
import { boolFrom, boolVal } from "../db/helpers";
import { cacheInvalidatePrefix } from "../services/redis";
import { getSocketServer } from "../services/notifications";
import { syncOddsForMatch, deleteOddsForMatch, getOddsForMatch, buildDefaultCorrectScoreForSport } from "./odds";
import { settleMatchBets } from "./settlement";
import { TRACKED_LEAGUES, leagueSlugFromName } from "./sportsdb/leagues";
import { resolveLeagueBadgeUrl } from "./sportsdb/badges";
import { resolveTeamLogo } from "./team-logos";
import { ensureMatchSchema } from "../db/schema-verify";
import {
  computeEffectiveLiveMinute,
  FULL_TIME_MINUTE,
  getMatchDurationMinutes,
  buildTimerFieldsForStatus,
  DEFAULT_MATCH_DURATION_MINUTES,
} from "./match-timer";
import { isMatchInPlayRow, shouldFinishMatch } from "./match-status";

export type MatchStatus = "upcoming" | "live" | "finished";
export type FixtureWindow = "live" | "today" | "tomorrow" | "upcoming" | "week" | "results";

export const RESULTS_RETENTION_DAYS = 30;

export interface MatchRow {
  id: string;
  home_team: string;
  away_team: string;
  league: string;
  sport: string;
  start_time: string;
  is_live?: boolean | number;
  match_status?: string;
  is_featured?: boolean | number;
  betting_suspended?: boolean | number;
  is_simulated?: boolean | number;
  created_at?: string;
  odds_home: number;
  odds_draw?: number | null;
  odds_away: number;
  odds_over?: number | null;
  odds_under?: number | null;
  odds_btts_yes?: number | null;
  odds_btts_no?: number | null;
  over_under_line?: number | null;
  home_score?: number | null;
  away_score?: number | null;
  live_minute?: number | null;
}

export interface MatchApiPayload {
  id: string;
  homeTeam: { name: string; shortName: string; logo: string };
  awayTeam: { name: string; shortName: string; logo: string };
  league: string;
  leagueId: string;
  leagueBadge: string;
  sport: string;
  startTime: string;
  matchStatus: MatchStatus;
  isLive: boolean;
  isFeatured: boolean;
  bettingSuspended: boolean;
  isSimulated: boolean;
  createdAt: string;
  liveMinute?: number | null;
  liveMinuteDisplay?: string;
  timerPaused?: boolean;
  minuteTickAt?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  liveStatusShort?: string | null;
  homeYellowCards?: number;
  awayYellowCards?: number;
  homeRedCards?: number;
  awayRedCards?: number;
  liveDataAvailable?: boolean;
  liveDataError?: string | null;
  scoresPending?: boolean;
  matchDurationMinutes?: number;
  autoStart?: boolean;
  odds: {
    home: number;
    draw?: number;
    away: number;
    over?: number;
    under?: number;
    bttsYes?: number;
    bttsNo?: number;
    overUnderLine?: number;
    correctScore?: Record<string, number>;
    doubleChance?: Record<string, number>;
  };
}

export function normalizeMatchStatus(row: Record<string, unknown>): MatchStatus {
  const status = String(row.match_status || "").toLowerCase();
  const short = String(row.live_status_short || "").toUpperCase();
  const minute = Math.max(0, Number(row.live_minute ?? 0));
  const fullTime = getMatchDurationMinutes(row);
  const statusOverride = boolFrom(row, "status_override");

  if (status === "finished") return "finished";

  if (minute >= fullTime && status !== "upcoming") return "finished";

  if (statusOverride && status === "live") return "live";

  if (["FT", "AET", "PEN"].includes(short)) return "finished";

  if (status === "live" || status === "upcoming") {
    return status as MatchStatus;
  }

  if (boolFrom(row, "is_live")) return "live";
  return "upcoming";
}

function resolveLiveStatusShortForStatus(
  status: MatchStatus,
  row: Record<string, unknown>
): string | null {
  if (status === "finished") return "FT";
  if (status === "upcoming") return "NS";
  if (status === "live") {
    const existing = String(row.live_status_short || "")
      .trim()
      .toUpperCase();
    if (["1H", "2H", "HT", "LIVE", "INT", "ET", "P", "BT", "IN PLAY"].includes(existing)) {
      return existing;
    }
    return boolFrom(row, "is_simulated") ? "1H" : "LIVE";
  }
  return null;
}

/** True when a match should appear in live sections. */
export function isMatchLive(row: Record<string, unknown>): boolean {
  return isMatchInPlayRow(row);
}

export function syncLiveFields(status: MatchStatus) {
  return {
    match_status: status,
    is_live: status === "live",
  };
}

function resolveScoresForApi(
  row: Record<string, unknown>,
  matchStatus: MatchStatus,
  isLive: boolean
): { homeScore: number | null; awayScore: number | null; scoresPending: boolean } {
  const rawHome = row.home_score != null ? Number(row.home_score) : null;
  const rawAway = row.away_score != null ? Number(row.away_score) : null;
  const hasActual = rawHome != null && rawAway != null;
  const inPlay = isLive || matchStatus === "live" || matchStatus === "finished";

  if (hasActual) {
    return { homeScore: rawHome, awayScore: rawAway, scoresPending: false };
  }

  if (inPlay) {
    return { homeScore: 0, awayScore: 0, scoresPending: true };
  }

  return { homeScore: null, awayScore: null, scoresPending: false };
}

export function mapMatchRow(
  row: Record<string, unknown>,
  extra?: { correctScore?: Record<string, number>; doubleChance?: Record<string, number> }
): MatchApiPayload {
  const matchStatus = normalizeMatchStatus(row);
  const leagueName = String(row.league ?? "");
  const leagueSlug = leagueSlugFromName(leagueName);
  const leagueBadge = resolveLeagueBadgeUrl(
    leagueName,
    leagueSlug,
    null,
    row.league_badge ? String(row.league_badge) : null,
    boolFrom(row, "is_simulated")
  );
  const homeLogoRaw = row.home_team_logo ? String(row.home_team_logo) : "";
  const awayLogoRaw = row.away_team_logo ? String(row.away_team_logo) : "";
  const homeLogo =
    homeLogoRaw.startsWith("http") || homeLogoRaw.startsWith("/") ? homeLogoRaw : "⚽";
  const awayLogo =
    awayLogoRaw.startsWith("http") || awayLogoRaw.startsWith("/") ? awayLogoRaw : "⚽";
  const timer = computeEffectiveLiveMinute(row);
  const isLive = isMatchLive(row);
  const scores = resolveScoresForApi(row, matchStatus, isLive);
  const hasApiFootball = Boolean(row.apifootball_fixture_id);
  return {
    id: String(row.id),
    homeTeam: {
      name: String(row.home_team),
      shortName: String(row.home_team).slice(0, 3).toUpperCase(),
      logo: homeLogo,
    },
    awayTeam: {
      name: String(row.away_team),
      shortName: String(row.away_team).slice(0, 3).toUpperCase(),
      logo: awayLogo,
    },
    league: leagueName,
    leagueId: leagueSlug,
    leagueBadge,
    sport: String(row.sport),
    startTime: String(row.start_time),
    matchStatus,
    isLive,
    isFeatured: boolFrom(row, "is_featured"),
    bettingSuspended: matchStatus === "finished" || boolFrom(row, "betting_suspended"),
    isSimulated: boolFrom(row, "is_simulated"),
    createdAt: String(row.created_at || row.start_time),
    liveMinute: timer.minute,
    liveMinuteDisplay: timer.display,
    timerPaused: timer.paused,
    minuteTickAt: row.minute_tick_at ? String(row.minute_tick_at) : null,
    homeScore: scores.homeScore,
    awayScore: scores.awayScore,
    scoresPending: scores.scoresPending,
    matchDurationMinutes: getMatchDurationMinutes(row),
    autoStart: row.auto_start != null ? boolFrom(row, "auto_start") : true,
    liveStatusShort:
      matchStatus === "finished"
        ? String(row.live_status_short || "FT")
        : row.live_status_short
          ? String(row.live_status_short)
          : null,
    homeYellowCards: row.home_yellow_cards != null ? Number(row.home_yellow_cards) : 0,
    awayYellowCards: row.away_yellow_cards != null ? Number(row.away_yellow_cards) : 0,
    homeRedCards: row.home_red_cards != null ? Number(row.home_red_cards) : 0,
    awayRedCards: row.away_red_cards != null ? Number(row.away_red_cards) : 0,
    liveDataAvailable: hasApiFootball
      ? row.live_data_available == null
        ? true
        : boolFrom(row, "live_data_available")
      : true,
    liveDataError: row.live_data_error ? String(row.live_data_error) : null,
    odds: {
      home: Number(row.odds_home),
      draw: row.odds_draw != null ? Number(row.odds_draw) : undefined,
      away: Number(row.odds_away),
      over: row.odds_over != null ? Number(row.odds_over) : undefined,
      under: row.odds_under != null ? Number(row.odds_under) : undefined,
      bttsYes: row.odds_btts_yes != null ? Number(row.odds_btts_yes) : undefined,
      bttsNo: row.odds_btts_no != null ? Number(row.odds_btts_no) : undefined,
      overUnderLine: row.over_under_line != null ? Number(row.over_under_line) : undefined,
      correctScore: extra?.correctScore,
      doubleChance: extra?.doubleChance,
    },
  };
}

async function enrichMatch(row: Record<string, unknown>): Promise<MatchApiPayload> {
  const db = await getDb();
  const id = String(row.id);
  const { correctScore, doubleChance } = await getOddsForMatch(id);
  const payload = mapMatchRow(row, {
    correctScore: Object.keys(correctScore).length ? correctScore : undefined,
    doubleChance: Object.keys(doubleChance).length ? doubleChance : undefined,
  });

  const [homeLogo, awayLogo] = await Promise.all([
    resolveTeamLogo(db, payload.homeTeam.name, row.home_team_logo ? String(row.home_team_logo) : null),
    resolveTeamLogo(db, payload.awayTeam.name, row.away_team_logo ? String(row.away_team_logo) : null),
  ]);

  payload.homeTeam.logo = homeLogo;
  payload.awayTeam.logo = awayLogo;
  return payload;
}

export async function getMatchById(id: string): Promise<MatchApiPayload | null> {
  const db = await getDb();
  const result = await db.query(`SELECT * FROM matches WHERE id = ?`, [id]);
  if (result.rows.length === 0) return null;
  return enrichMatch(result.rows[0]);
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function matchesFixtureWindow(row: Record<string, unknown>, window: FixtureWindow): boolean {
  const status = normalizeMatchStatus(row);
  const start = new Date(String(row.start_time));
  const now = new Date();

  if (window === "live") return isMatchLive(row);

  if (window === "today") {
    return isSameCalendarDay(start, now) && status !== "finished";
  }

  if (window === "tomorrow") {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return isSameCalendarDay(start, tomorrow) && status !== "finished";
  }

  if (window === "upcoming") {
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    end.setHours(23, 59, 59, 999);
    return status === "upcoming" && start >= now && start <= end;
  }

  if (window === "week") {
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    end.setHours(23, 59, 59, 999);
    return start >= now && start <= end && status !== "finished";
  }

  return true;
}

function isWithinResultsRetention(row: Record<string, unknown>): boolean {
  const start = new Date(String(row.start_time || row.created_at || ""));
  if (Number.isNaN(start.getTime())) return true;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RESULTS_RETENTION_DAYS);
  cutoff.setHours(0, 0, 0, 0);
  return start >= cutoff;
}

function matchesLeagueFilter(row: Record<string, unknown>, league: string): boolean {
  const q = league.toLowerCase().trim();
  if (!q || q === "all") return true;

  const leagueName = String(row.league ?? "").toLowerCase();
  const slug = leagueSlugFromName(String(row.league ?? ""));

  if (slug === q || leagueName.includes(q)) return true;

  const tracked = TRACKED_LEAGUES.find((l) => l.id === league || l.slug === q);
  if (tracked) {
    return leagueName.includes(tracked.name.toLowerCase()) || tracked.name.toLowerCase().includes(leagueName);
  }

  return false;
}

function matchesSearchQuery(row: Record<string, unknown>, search: string): boolean {
  const q = search.toLowerCase().trim();
  if (!q) return true;
  return (
    String(row.home_team ?? "").toLowerCase().includes(q) ||
    String(row.away_team ?? "").toLowerCase().includes(q) ||
    String(row.league ?? "").toLowerCase().includes(q)
  );
}

export async function listMatches(filters?: {
  sport?: string;
  live?: boolean;
  featured?: boolean;
  simulated?: boolean;
  status?: MatchStatus;
  league?: string;
  search?: string;
  window?: FixtureWindow;
}): Promise<MatchApiPayload[]> {
  const db = await getDb();
  await ensureMatchSchema(db);

  let query = `SELECT * FROM matches`;
  if (filters?.live === true && db.driver === "postgresql") {
    query += ` WHERE (LOWER(COALESCE(match_status, '')) = 'live' OR is_live = TRUE)
      AND LOWER(COALESCE(match_status, '')) != 'finished'`;
  }
  query += ` ORDER BY is_live DESC, start_time ASC`;

  const result = await db.query(query);
  let rows = result.rows;
  const totalRows = rows.length;

  if (filters?.sport) rows = rows.filter((m) => m.sport === filters.sport);
  if (filters?.live === true) {
    const before = rows.length;
    rows = rows.filter((m) => isMatchLive(m));
    console.log(
      `[listMatches] live=true sport=${filters.sport ?? "all"}: ${before} -> ${rows.length} (db rows=${totalRows}) ids=${rows.map((m) => m.id).join(",") || "none"}`
    );
  }
  if (filters?.featured === true) rows = rows.filter((m) => boolFrom(m, "is_featured"));
  if (filters?.simulated === true) rows = rows.filter((m) => boolFrom(m, "is_simulated"));
  if (filters?.simulated === false) rows = rows.filter((m) => !boolFrom(m, "is_simulated"));
  if (filters?.status) rows = rows.filter((m) => normalizeMatchStatus(m) === filters.status);
  if (filters?.status === "finished") {
    rows = rows.filter((m) => isWithinResultsRetention(m));
    rows.sort(
      (a, b) =>
        new Date(String(b.start_time)).getTime() - new Date(String(a.start_time)).getTime()
    );
  }
  if (filters?.league) rows = rows.filter((m) => matchesLeagueFilter(m, filters.league!));
  if (filters?.search) rows = rows.filter((m) => matchesSearchQuery(m, filters.search!));
  if (filters?.window) rows = rows.filter((m) => matchesFixtureWindow(m, filters.window!));

  return Promise.all(rows.map((row) => enrichMatch(row)));
}

export async function invalidateMatchCache(): Promise<void> {
  await cacheInvalidatePrefix("matches:");
}

export async function emitMatchChange(
  action: "created" | "updated" | "deleted",
  match?: MatchApiPayload | null,
  matchId?: string
): Promise<void> {
  await invalidateMatchCache();
  const io = getSocketServer();
  if (!io) return;
  io.emit("match_updated", { action, match: match ?? undefined, matchId });
  if (action === "deleted" && matchId) {
    io.emit("match_deleted", { matchId });
  }
}

export interface MatchInput {
  homeTeam: string;
  awayTeam: string;
  league: string;
  sport: string;
  startTime?: string;
  matchStatus?: MatchStatus;
  isFeatured?: boolean;
  bettingSuspended?: boolean;
  isSimulated?: boolean;
  oddsHome?: number;
  oddsDraw?: number | null;
  oddsAway?: number;
  oddsOver?: number | null;
  oddsUnder?: number | null;
  oddsBttsYes?: number | null;
  oddsBttsNo?: number | null;
  overUnderLine?: number | null;
  homeScore?: number | null;
  awayScore?: number | null;
  liveMinute?: number | null;
  matchDurationMinutes?: number;
  autoStart?: boolean;
  correctScoreOdds?: Record<string, number>;
  doubleChanceOdds?: Record<string, number>;
}

export async function createMatchRecord(id: string, input: MatchInput) {
  const db = await getDb();
  await ensureMatchSchema(db);
  const status = input.matchStatus || "upcoming";
  const live = syncLiveFields(status);
  const statusOverride = status === "live";
  const duration = input.matchDurationMinutes ?? DEFAULT_MATCH_DURATION_MINUTES;
  const autoStart = input.autoStart !== false;
  const timerInit =
    status === "live"
      ? buildTimerFieldsForStatus("live", {
          minuteInput: input.liveMinute ?? 0,
          durationMinutes: duration,
        })
      : status === "finished"
        ? buildTimerFieldsForStatus("finished", { durationMinutes: duration })
        : buildTimerFieldsForStatus("upcoming", { durationMinutes: duration });
  const createdAt = new Date().toISOString();
  const leagueBadge = resolveLeagueBadgeUrl(
    input.league,
    leagueSlugFromName(input.league),
    null,
    null,
    !!input.isSimulated
  );
  const [homeLogo, awayLogo] = await Promise.all([
    resolveTeamLogo(db, input.homeTeam),
    resolveTeamLogo(db, input.awayTeam),
  ]);

  const baseParams = [
    id,
    input.homeTeam,
    input.awayTeam,
    input.league,
    input.sport,
    input.startTime || createdAt,
    boolVal(db, live.is_live),
    live.match_status,
    boolVal(db, !!input.isFeatured),
    boolVal(db, !!input.bettingSuspended),
    boolVal(db, !!input.isSimulated),
    createdAt,
    input.oddsHome ?? 1.5,
    input.oddsDraw ?? null,
    input.oddsAway ?? 2.5,
    input.oddsOver ?? null,
    input.oddsUnder ?? null,
    input.oddsBttsYes ?? null,
    input.oddsBttsNo ?? null,
    input.overUnderLine ?? 2.5,
    input.homeScore ?? null,
    input.awayScore ?? null,
    timerInit.liveMinute ?? input.liveMinute ?? null,
    homeLogo.startsWith("http") || homeLogo.startsWith("/") ? homeLogo : null,
    awayLogo.startsWith("http") || awayLogo.startsWith("/") ? awayLogo : null,
    leagueBadge,
  ];

  try {
    await db.query(
      `INSERT INTO matches (
        id, home_team, away_team, league, sport, start_time, is_live, match_status,
        is_featured, betting_suspended, is_simulated, status_override, created_at,
        odds_home, odds_draw, odds_away,
        odds_over, odds_under, odds_btts_yes, odds_btts_no, over_under_line,
        home_score, away_score, live_minute, timer_paused, minute_tick_at,
        match_duration_minutes, auto_start,
        home_team_logo, away_team_logo, league_badge
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ...baseParams.slice(0, 11),
        boolVal(db, statusOverride),
        ...baseParams.slice(11, 23),
        boolVal(db, timerInit.timerPaused),
        timerInit.minuteTickAt,
        duration,
        boolVal(db, autoStart),
        ...baseParams.slice(23),
      ]
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("does not exist") && msg.includes("column")) {
      await db.query(
        `INSERT INTO matches (
          id, home_team, away_team, league, sport, start_time, is_live, match_status,
          is_featured, betting_suspended,
          odds_home, odds_draw, odds_away,
          odds_over, odds_under, odds_btts_yes, odds_btts_no, over_under_line,
          home_score, away_score, live_minute
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        baseParams.slice(0, 10).concat(baseParams.slice(12, 23))
      );
    } else {
      throw err;
    }
  }

  try {
    await db.query(`UPDATE matches SET match_duration_minutes = ?, auto_start = ? WHERE id = ?`, [
      duration,
      boolVal(db, autoStart),
      id,
    ]);
  } catch (err) {
    console.warn("[matches] Could not set scheduling columns:", err instanceof Error ? err.message : err);
  }

  if (status === "live") {
    try {
      await db.query(`UPDATE matches SET timer_paused = ?, minute_tick_at = ?, status_override = ? WHERE id = ?`, [
        boolVal(db, timerInit.timerPaused ?? false),
        timerInit.minuteTickAt,
        boolVal(db, statusOverride),
        id,
      ]);
    } catch (err) {
      console.warn("[matches] Could not init match timer columns:", err instanceof Error ? err.message : err);
    }
  }

  try {
    const sport = input.sport;
    const oddsExtras =
      input.correctScoreOdds || input.doubleChanceOdds
        ? input
        : sport === "football"
          ? {
              ...input,
              ...buildDefaultCorrectScoreForSport(
                sport,
                input.oddsHome ?? 1.5,
                input.oddsDraw ?? null,
                input.oddsAway ?? 2.5
              ),
            }
          : input;
    await syncOddsForMatch(id, oddsExtras);
  } catch (err) {
    try {
      await deleteOddsForMatch(id);
      await db.query(`DELETE FROM matches WHERE id = ?`, [id]);
    } catch {
      // best-effort rollback
    }
    throw err;
  }

  if (status === "upcoming" && autoStart) {
    const { promoteMatchIfDue } = await import("./kickoff-scheduler");
    await promoteMatchIfDue(id);
  }
}

export async function updateMatchRecord(id: string, input: Partial<MatchInput>) {
  const db = await getDb();
  await ensureMatchSchema(db);
  const existing = await db.query(`SELECT * FROM matches WHERE id = ?`, [id]);
  if (existing.rows.length === 0) return null;

  const row = existing.rows[0];
  const status = (input.matchStatus || normalizeMatchStatus(row)) as MatchStatus;
  const live = syncLiveFields(status);
  const statusOverride =
    input.matchStatus !== undefined ? true : boolFrom(row, "status_override");
  const duration =
    input.matchDurationMinutes !== undefined
      ? input.matchDurationMinutes
      : getMatchDurationMinutes(row);
  const autoStart =
    input.autoStart !== undefined ? input.autoStart : row.auto_start != null ? boolFrom(row, "auto_start") : true;

  let timerInit: {
    liveMinute: number;
    timerPaused: boolean;
    minuteTickAt: string | null;
  };

  if (status === "finished") {
    timerInit = buildTimerFieldsForStatus("finished", { durationMinutes: duration });
  } else if (status === "live") {
    const minute =
      input.liveMinute !== undefined ? input.liveMinute : Math.max(0, Number(row.live_minute ?? 0));
    timerInit = buildTimerFieldsForStatus("live", {
      minuteInput: minute,
      existingMinute: row.live_minute != null ? Number(row.live_minute) : 0,
      durationMinutes: duration,
    });
  } else {
    timerInit = buildTimerFieldsForStatus("upcoming", { durationMinutes: duration });
  }

  const resolvedLiveMinute = timerInit.liveMinute;
  const resolvedTimerPaused = timerInit.timerPaused;
  const resolvedMinuteTickAt = timerInit.minuteTickAt;
  const isSimulated =
    input.isSimulated !== undefined ? input.isSimulated : boolFrom(row, "is_simulated");
  const liveStatusShort = resolveLiveStatusShortForStatus(status, {
    ...row,
    is_simulated: isSimulated,
    live_status_short:
      input.matchStatus !== undefined ? undefined : row.live_status_short,
  });

  await db.query(
    `UPDATE matches SET
      home_team = ?, away_team = ?, league = ?, sport = ?, start_time = ?,
      is_live = ?, match_status = ?, is_featured = ?, betting_suspended = ?, is_simulated = ?,
      status_override = ?,
      odds_home = ?, odds_draw = ?, odds_away = ?,
      odds_over = ?, odds_under = ?, odds_btts_yes = ?, odds_btts_no = ?, over_under_line = ?,
      home_score = ?, away_score = ?, live_minute = ?, timer_paused = ?, minute_tick_at = ?,
      match_duration_minutes = ?, auto_start = ?, live_status_short = ?
     WHERE id = ?`,
    [
      input.homeTeam ?? row.home_team,
      input.awayTeam ?? row.away_team,
      input.league ?? row.league,
      input.sport ?? row.sport,
      input.startTime ?? row.start_time,
      boolVal(db, live.is_live),
      live.match_status,
      boolVal(db, input.isFeatured !== undefined ? input.isFeatured : boolFrom(row, "is_featured")),
      boolVal(
        db,
        status === "finished"
          ? true
          : input.bettingSuspended !== undefined
            ? input.bettingSuspended
            : boolFrom(row, "betting_suspended")
      ),
      boolVal(db, input.isSimulated !== undefined ? input.isSimulated : boolFrom(row, "is_simulated")),
      boolVal(db, statusOverride),
      input.oddsHome ?? row.odds_home,
      input.oddsDraw !== undefined ? input.oddsDraw : row.odds_draw,
      input.oddsAway ?? row.odds_away,
      input.oddsOver !== undefined ? input.oddsOver : row.odds_over,
      input.oddsUnder !== undefined ? input.oddsUnder : row.odds_under,
      input.oddsBttsYes !== undefined ? input.oddsBttsYes : row.odds_btts_yes,
      input.oddsBttsNo !== undefined ? input.oddsBttsNo : row.odds_btts_no,
      input.overUnderLine !== undefined ? input.overUnderLine : row.over_under_line ?? 2.5,
      input.homeScore !== undefined ? input.homeScore : row.home_score,
      input.awayScore !== undefined ? input.awayScore : row.away_score,
      resolvedLiveMinute,
      boolVal(db, resolvedTimerPaused),
      resolvedMinuteTickAt,
      duration,
      boolVal(db, autoStart),
      liveStatusShort,
      id,
    ]
  );

  await syncOddsForMatch(id, input, row);

  if (status === "finished" && normalizeMatchStatus(row) !== "finished") {
    await settleMatchBets(id);
  }

  if (status === "upcoming" && autoStart) {
    const { promoteMatchIfDue } = await import("./kickoff-scheduler");
    await promoteMatchIfDue(id);
  }

  return getMatchById(id);
}

export async function deleteMatchRecord(id: string): Promise<boolean> {
  const db = await getDb();
  const existing = await db.query(`SELECT id FROM matches WHERE id = ?`, [id]);
  if (existing.rows.length === 0) return false;
  await deleteOddsForMatch(id);
  await db.query(`DELETE FROM matches WHERE id = ?`, [id]);
  return true;
}
