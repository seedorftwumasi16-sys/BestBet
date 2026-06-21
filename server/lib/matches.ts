import { getDb } from "../db";
import { boolFrom, boolVal } from "../db/helpers";
import { cacheInvalidatePrefix } from "../services/redis";
import { getSocketServer } from "../services/notifications";
import { syncOddsForMatch, deleteOddsForMatch } from "./odds";

export type MatchStatus = "upcoming" | "live" | "finished";

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
  sport: string;
  startTime: string;
  matchStatus: MatchStatus;
  isLive: boolean;
  isFeatured: boolean;
  bettingSuspended: boolean;
  liveMinute?: number | null;
  homeScore?: number | null;
  awayScore?: number | null;
  odds: {
    home: number;
    draw?: number;
    away: number;
    over?: number;
    under?: number;
    bttsYes?: number;
    bttsNo?: number;
    overUnderLine?: number;
  };
}

export function normalizeMatchStatus(row: Record<string, unknown>): MatchStatus {
  const status = String(row.match_status || "").toLowerCase();
  if (status === "live" || status === "finished" || status === "upcoming") {
    return status as MatchStatus;
  }
  if (boolFrom(row, "is_live")) return "live";
  return "upcoming";
}

export function syncLiveFields(status: MatchStatus) {
  return {
    match_status: status,
    is_live: status === "live",
  };
}

export function mapMatchRow(row: Record<string, unknown>): MatchApiPayload {
  const matchStatus = normalizeMatchStatus(row);
  return {
    id: String(row.id),
    homeTeam: {
      name: String(row.home_team),
      shortName: String(row.home_team).slice(0, 3).toUpperCase(),
      logo: "⚽",
    },
    awayTeam: {
      name: String(row.away_team),
      shortName: String(row.away_team).slice(0, 3).toUpperCase(),
      logo: "⚽",
    },
    league: String(row.league),
    leagueId: String(row.league).toLowerCase().replace(/\s+/g, "-"),
    sport: String(row.sport),
    startTime: String(row.start_time),
    matchStatus,
    isLive: matchStatus === "live",
    isFeatured: boolFrom(row, "is_featured"),
    bettingSuspended: boolFrom(row, "betting_suspended"),
    liveMinute: row.live_minute != null ? Number(row.live_minute) : null,
    homeScore: row.home_score != null ? Number(row.home_score) : null,
    awayScore: row.away_score != null ? Number(row.away_score) : null,
    odds: {
      home: Number(row.odds_home),
      draw: row.odds_draw != null ? Number(row.odds_draw) : undefined,
      away: Number(row.odds_away),
      over: row.odds_over != null ? Number(row.odds_over) : undefined,
      under: row.odds_under != null ? Number(row.odds_under) : undefined,
      bttsYes: row.odds_btts_yes != null ? Number(row.odds_btts_yes) : undefined,
      bttsNo: row.odds_btts_no != null ? Number(row.odds_btts_no) : undefined,
      overUnderLine: row.over_under_line != null ? Number(row.over_under_line) : undefined,
    },
  };
}

export async function getMatchById(id: string): Promise<MatchApiPayload | null> {
  const db = await getDb();
  const result = await db.query(`SELECT * FROM matches WHERE id = ?`, [id]);
  if (result.rows.length === 0) return null;
  return mapMatchRow(result.rows[0]);
}

export async function listMatches(filters?: {
  sport?: string;
  live?: boolean;
  featured?: boolean;
  status?: MatchStatus;
}): Promise<MatchApiPayload[]> {
  const db = await getDb();
  const result = await db.query(`SELECT * FROM matches ORDER BY is_live DESC, start_time ASC`);
  let rows = result.rows;

  if (filters?.sport) rows = rows.filter((m) => m.sport === filters.sport);
  if (filters?.live === true) rows = rows.filter((m) => normalizeMatchStatus(m) === "live");
  if (filters?.featured === true) rows = rows.filter((m) => boolFrom(m, "is_featured"));
  if (filters?.status) rows = rows.filter((m) => normalizeMatchStatus(m) === filters.status);

  return rows.map((row) => mapMatchRow(row));
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
}

export async function createMatchRecord(id: string, input: MatchInput) {
  const db = await getDb();
  const status = input.matchStatus || "upcoming";
  const live = syncLiveFields(status);
  await db.query(
    `INSERT INTO matches (
      id, home_team, away_team, league, sport, start_time, is_live, match_status,
      is_featured, betting_suspended, odds_home, odds_draw, odds_away,
      odds_over, odds_under, odds_btts_yes, odds_btts_no, over_under_line,
      home_score, away_score, live_minute
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.homeTeam,
      input.awayTeam,
      input.league,
      input.sport,
      input.startTime || new Date().toISOString(),
      boolVal(db, live.is_live),
      live.match_status,
      boolVal(db, !!input.isFeatured),
      boolVal(db, !!input.bettingSuspended),
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
      input.liveMinute ?? null,
    ]
  );
  await syncOddsForMatch(id, input);
}

export async function updateMatchRecord(id: string, input: Partial<MatchInput>) {
  const db = await getDb();
  const existing = await db.query(`SELECT * FROM matches WHERE id = ?`, [id]);
  if (existing.rows.length === 0) return null;

  const row = existing.rows[0];
  const status = (input.matchStatus || normalizeMatchStatus(row)) as MatchStatus;
  const live = syncLiveFields(status);

  await db.query(
    `UPDATE matches SET
      home_team = ?, away_team = ?, league = ?, sport = ?, start_time = ?,
      is_live = ?, match_status = ?, is_featured = ?, betting_suspended = ?,
      odds_home = ?, odds_draw = ?, odds_away = ?,
      odds_over = ?, odds_under = ?, odds_btts_yes = ?, odds_btts_no = ?, over_under_line = ?,
      home_score = ?, away_score = ?, live_minute = ?
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
      boolVal(db, input.bettingSuspended !== undefined ? input.bettingSuspended : boolFrom(row, "betting_suspended")),
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
      input.liveMinute !== undefined ? input.liveMinute : row.live_minute,
      id,
    ]
  );

  await syncOddsForMatch(id, input, row);
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
