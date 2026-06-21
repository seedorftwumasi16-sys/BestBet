import { v4 as uuidv4 } from "uuid";
import type { Database } from "../../db";
import { getDb } from "../../db";
import { boolVal } from "../../db/helpers";
import { invalidateMatchCache, emitMatchChange, getMatchById, syncLiveFields } from "../matches";
import { syncOddsForMatch, buildDefaultCorrectScoreForSport } from "../odds";
import { settleMatchBets } from "../settlement";
import {
  TRACKED_LEAGUE_IDS,
  fetchAllLeagues,
  fetchTeamsByLeagueName,
  fetchNextFixtures,
  fetchTodayFixtures,
  pingSportsApi,
} from "./client";
import type { SportsDbEvent, SportsSyncResult } from "./types";
import type { MatchStatus } from "../matches";

const LIVE_STATUSES = new Set(["1H", "2H", "HT", "ET", "P", "LIVE", "BT", "INT", "IN PLAY"]);
const FINISHED_STATUSES = new Set(["FT", "AET", "PEN"]);

function mapSport(strSport: string): string {
  const s = strSport.toLowerCase();
  if (s === "soccer" || s === "football") return "football";
  return s;
}

function parseEventStatus(strStatus?: string): MatchStatus {
  const s = String(strStatus || "NS").toUpperCase();
  if (LIVE_STATUSES.has(s)) return "live";
  if (FINISHED_STATUSES.has(s)) return "finished";
  return "upcoming";
}

function parseStartTime(event: SportsDbEvent): string {
  if (event.strTimestamp) {
    const ts = new Date(event.strTimestamp);
    if (!Number.isNaN(ts.getTime())) return ts.toISOString();
  }
  const time = event.strTime || "12:00:00";
  return new Date(`${event.dateEvent}T${time}Z`).toISOString();
}

function parseScore(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function defaultOdds(home: string, away: string) {
  const seed = (home.length + away.length) % 7;
  return {
    home: +(1.55 + seed * 0.12).toFixed(2),
    draw: +(3.1 + (seed % 3) * 0.15).toFixed(2),
    away: +(1.75 + ((seed + 2) % 5) * 0.14).toFixed(2),
  };
}

function eventMatchId(eventId: string): string {
  return `tsdb-${eventId}`;
}

async function logSync(
  db: Database,
  result: Omit<SportsSyncResult, "ok"> & { ok: boolean }
): Promise<void> {
  await db.query(
    `INSERT INTO sports_sync_log (id, status, message, leagues_synced, teams_synced, events_synced, source) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      uuidv4(),
      result.ok ? "success" : "fallback",
      result.message,
      result.leaguesSynced,
      result.teamsSynced,
      result.eventsSynced,
      "thesportsdb",
    ]
  );
}

async function upsertLeague(db: Database, league: { id: string; name: string; sport: string; badge?: string }) {
  const existing = await db.query(`SELECT id FROM leagues WHERE external_id = ? OR id = ?`, [league.id, league.id]);
  if (existing.rows.length > 0) {
    await db.query(
      `UPDATE leagues SET name = ?, sport = ?, badge_url = ?, active = ? WHERE id = ? OR external_id = ?`,
      [league.name, league.sport, league.badge || null, boolVal(db, true), existing.rows[0].id, league.id]
    );
    return;
  }
  await db.query(
    `INSERT INTO leagues (id, external_id, name, country, sport, badge_url, active) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [league.id, league.id, league.name, null, league.sport, league.badge || null, boolVal(db, true)]
  );
}

async function upsertTeam(
  db: Database,
  team: { externalId: string; name: string; shortName?: string; badge?: string; leagueId?: string; leagueName?: string; sport: string; country?: string }
) {
  const existing = await db.query(`SELECT id FROM sports_teams WHERE external_id = ?`, [team.externalId]);
  if (existing.rows.length > 0) {
    await db.query(
      `UPDATE sports_teams SET name = ?, short_name = ?, badge_url = ?, league_id = ?, league_name = ?, sport = ?, country = ?, updated_at = ? WHERE external_id = ?`,
      [
        team.name,
        team.shortName || team.name.slice(0, 3).toUpperCase(),
        team.badge || null,
        team.leagueId || null,
        team.leagueName || null,
        team.sport,
        team.country || null,
        new Date().toISOString(),
        team.externalId,
      ]
    );
    return;
  }
  await db.query(
    `INSERT INTO sports_teams (id, external_id, name, short_name, badge_url, league_id, league_name, sport, country, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uuidv4(),
      team.externalId,
      team.name,
      team.shortName || team.name.slice(0, 3).toUpperCase(),
      team.badge || null,
      team.leagueId || null,
      team.leagueName || null,
      team.sport,
      team.country || null,
      new Date().toISOString(),
    ]
  );
}

async function upsertEvent(db: Database, event: SportsDbEvent): Promise<boolean> {
  const externalId = String(event.idEvent);
  const matchId = eventMatchId(externalId);
  const status = parseEventStatus(event.strStatus);
  const live = syncLiveFields(status);
  const sport = mapSport(event.strSport);
  const startTime = parseStartTime(event);
  const homeScore = parseScore(event.intHomeScore);
  const awayScore = parseScore(event.intAwayScore);
  const liveMinute = event.strProgress ? parseInt(String(event.strProgress), 10) : null;
  const isFeatured =
    status === "upcoming" && new Date(startTime).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

  const existing = await db.query(`SELECT * FROM matches WHERE external_event_id = ? OR id = ?`, [
    externalId,
    matchId,
  ]);

  if (existing.rows.length === 0) {
    const odds = defaultOdds(event.strHomeTeam, event.strAwayTeam);
    const csDefaults = buildDefaultCorrectScoreForSport(sport, odds.home, odds.draw, odds.away);
    await db.query(
      `INSERT INTO matches (
        id, external_event_id, home_team, away_team, league, sport, start_time,
        is_live, match_status, is_featured, betting_suspended,
        odds_home, odds_draw, odds_away, odds_over, odds_under, odds_btts_yes, odds_btts_no, over_under_line,
        home_score, away_score, live_minute, home_team_logo, away_team_logo, league_badge
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        matchId,
        externalId,
        event.strHomeTeam,
        event.strAwayTeam,
        event.strLeague,
        sport,
        startTime,
        boolVal(db, live.is_live),
        live.match_status,
        boolVal(db, isFeatured),
        boolVal(db, status === "finished"),
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
        liveMinute,
        event.strHomeTeamBadge || null,
        event.strAwayTeamBadge || null,
        event.strLeagueBadge || null,
      ]
    );
    await syncOddsForMatch(matchId, {
      sport,
      oddsHome: odds.home,
      oddsDraw: odds.draw,
      oddsAway: odds.away,
      correctScoreOdds: csDefaults.correctScoreOdds,
      doubleChanceOdds: csDefaults.doubleChanceOdds,
    });
    const payload = await getMatchById(matchId);
    await emitMatchChange("created", payload);
    return true;
  }

  const row = existing.rows[0];
  const prevStatus = String(row.match_status || "upcoming");
  await db.query(
    `UPDATE matches SET
      home_team = ?, away_team = ?, league = ?, sport = ?, start_time = ?,
      is_live = ?, match_status = ?, home_score = ?, away_score = ?, live_minute = ?,
      home_team_logo = ?, away_team_logo = ?, league_badge = ?,
      betting_suspended = ?
     WHERE id = ?`,
    [
      event.strHomeTeam,
      event.strAwayTeam,
      event.strLeague,
      sport,
      startTime,
      boolVal(db, live.is_live),
      live.match_status,
      homeScore,
      awayScore,
      liveMinute,
      event.strHomeTeamBadge || row.home_team_logo,
      event.strAwayTeamBadge || row.away_team_logo,
      event.strLeagueBadge || row.league_badge,
      boolVal(db, status === "finished"),
      row.id,
    ]
  );

  if (status === "finished" && prevStatus !== "finished") {
    await settleMatchBets(String(row.id));
  }

  const payload = await getMatchById(String(row.id));
  await emitMatchChange("updated", payload);
  return false;
}

export async function syncSportsData(): Promise<SportsSyncResult> {
  const db = await getDb();
  let leaguesSynced = 0;
  let teamsSynced = 0;
  let eventsSynced = 0;
  let liveUpdated = 0;

  const apiOk = await pingSportsApi();
  if (!apiOk) {
    const message = "TheSportsDB API unavailable — using cached database matches";
    console.warn(`[sports-sync] ${message}`);
    await logSync(db, { ok: false, leaguesSynced: 0, teamsSynced: 0, eventsSynced: 0, liveUpdated: 0, message, usedFallback: true });
    return { ok: false, leaguesSynced: 0, teamsSynced: 0, eventsSynced: 0, liveUpdated: 0, message, usedFallback: true };
  }

  try {
    const allLeagues = await fetchAllLeagues();
    const tracked = allLeagues.filter((l) => TRACKED_LEAGUE_IDS.includes(String(l.idLeague)));

    for (const league of tracked) {
      await upsertLeague(db, {
        id: String(league.idLeague),
        name: league.strLeague,
        sport: mapSport(league.strSport),
      });
      leaguesSynced += 1;

      const teams = await fetchTeamsByLeagueName(league.strLeague);
      for (const team of teams.slice(0, 25)) {
        await upsertTeam(db, {
          externalId: String(team.idTeam),
          name: team.strTeam,
          shortName: team.strTeamShort,
          badge: team.strBadge,
          leagueId: String(league.idLeague),
          leagueName: league.strLeague,
          sport: mapSport(team.strSport || league.strSport),
          country: team.strCountry,
        });
        teamsSynced += 1;
      }
    }

    const todayEvents = await fetchTodayFixtures(new Date(), "Soccer");
    const eventMap = new Map<string, SportsDbEvent>();

    for (const e of todayEvents) {
      if (TRACKED_LEAGUE_IDS.includes(String(e.idLeague))) {
        eventMap.set(String(e.idEvent), e);
      }
    }

    for (const leagueId of TRACKED_LEAGUE_IDS) {
      const fixtures = await fetchNextFixtures(leagueId);
      for (const e of fixtures) {
        eventMap.set(String(e.idEvent), e);
      }
    }

    for (const event of eventMap.values()) {
      await upsertEvent(db, event);
      eventsSynced += 1;
      if (parseEventStatus(event.strStatus) === "live") liveUpdated += 1;
    }

    await invalidateMatchCache();

    const message = `Synced ${leaguesSynced} leagues, ${teamsSynced} teams, ${eventsSynced} events (${liveUpdated} live)`;
    console.log(`[sports-sync] ${message}`);
    await logSync(db, { ok: true, leaguesSynced, teamsSynced, eventsSynced, liveUpdated, message, usedFallback: false });

    return { ok: true, leaguesSynced, teamsSynced, eventsSynced, liveUpdated, message, usedFallback: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sports sync failed";
    console.error("[sports-sync]", err);
    await logSync(db, { ok: false, leaguesSynced, teamsSynced, eventsSynced, liveUpdated, message, usedFallback: true });
    return { ok: false, leaguesSynced, teamsSynced, eventsSynced, liveUpdated, message, usedFallback: true };
  }
}

export async function getLastSyncStatus(db?: Database) {
  const database = db || (await getDb());
  const result = await database.query(
    `SELECT status, message, leagues_synced, teams_synced, events_synced, created_at FROM sports_sync_log ORDER BY created_at DESC LIMIT 1`
  );
  return result.rows[0] || null;
}
