import { Router } from "express";
import { getDb } from "../db";
import { getLastSyncStatus } from "../lib/sportsdb/sync";
import { pingSportsApi, getSportsApiKey } from "../lib/sportsdb/client";
import { getApiFootballSettings } from "../lib/apifootball/settings";
import { pingApiFootball } from "../lib/apifootball/client";
import { API_FOOTBALL_LEAGUES, currentFootballSeason } from "../lib/apifootball/leagues";
import { cacheGet, cacheSet } from "../services/redis";

const router = Router();

router.get("/status", async (_req, res) => {
  try {
    const db = await getDb();
    const apiSettings = await getApiFootballSettings();
    let lastSync = null;
    try {
      lastSync = await getLastSyncStatus(db);
    } catch {
      lastSync = null;
    }
    const sportsDbReachable = await pingSportsApi();
    const apiSportsReachable = apiSettings.enabled ? await pingApiFootball(apiSettings.apiKey) : false;

    let leaguesCount = 0;
    let teamsCount = 0;
    let syncedMatchesCount = 0;
    let apiFootballMatchesCount = 0;
    try {
      const leagues = await db.query(`SELECT id FROM leagues LIMIT 1`);
      leaguesCount = leagues.rows.length;
      const teams = await db.query(`SELECT COUNT(*) as count FROM sports_teams`);
      teamsCount = Number(teams.rows[0]?.count ?? 0);
      const syncedMatches = await db.query(`SELECT COUNT(*) as count FROM matches WHERE external_event_id IS NOT NULL`);
      syncedMatchesCount = Number(syncedMatches.rows[0]?.count ?? 0);
      const afMatches = await db.query(`SELECT COUNT(*) as count FROM matches WHERE apifootball_fixture_id IS NOT NULL`);
      apiFootballMatchesCount = Number(afMatches.rows[0]?.count ?? 0);
    } catch {
      /* tables may not exist yet during first deploy */
    }

    const leagues = await db.query(
      `SELECT id, name, sport, badge_url, external_id FROM leagues ORDER BY name ASC LIMIT 50`
    ).catch(() => ({ rows: [] }));

    res.json({
      provider: apiSettings.enabled ? "api-sports" : "thesportsdb",
      apiSports: {
        configured: apiSettings.enabled,
        keySource: apiSettings.source,
        reachable: apiSportsReachable,
        refreshSec: apiSettings.refreshIntervalMs / 1000,
        syncedMatches: apiFootballMatchesCount,
      },
      theSportsDb: {
        apiKeyConfigured: Boolean(getSportsApiKey()),
        apiReachable: sportsDbReachable,
      },
      lastSync: lastSync
        ? {
            status: lastSync.status,
            message: lastSync.message,
            leaguesSynced: lastSync.leagues_synced,
            teamsSynced: lastSync.teams_synced,
            eventsSynced: lastSync.events_synced,
            at: lastSync.created_at,
          }
        : null,
      cached: {
        leagues: leagues.rows.length,
        teams: teamsCount,
        syncedMatches: syncedMatchesCount,
      },
    });
  } catch (err) {
    console.error("[sports/status]", err);
    res.status(500).json({ error: "Failed to load sports sync status" });
  }
});

router.get("/leagues", async (_req, res) => {
  try {
    const db = await getDb();
    const result = await db.query(
      `SELECT id, external_id, name, country, sport, badge_url FROM leagues WHERE active = 1 OR active = true ORDER BY name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to load leagues" });
  }
});

router.get("/badges", async (_req, res) => {
  try {
    const db = await getDb();
    const { LEAGUE_BADGE_BY_SPORTSDB_ID, DEFAULT_LEAGUE_BADGE, SIMULATED_LEAGUE_BADGE } = await import("../lib/sportsdb/badges");
    const cached = await cacheGet<Record<string, string>>("sports:badges");
    if (cached) return res.json(cached);

    const fromDb = await db.query(
      `SELECT external_id, name, badge_url FROM leagues WHERE badge_url IS NOT NULL`
    ).catch(() => ({ rows: [] as Record<string, unknown>[] }));

    const badges: Record<string, string> = {
      ...LEAGUE_BADGE_BY_SPORTSDB_ID,
      default: DEFAULT_LEAGUE_BADGE,
      "simulated league": SIMULATED_LEAGUE_BADGE,
      "simulated-league": SIMULATED_LEAGUE_BADGE,
    };
    for (const row of fromDb.rows) {
      const externalId = String(row.external_id ?? row.id ?? "");
      const badge = row.badge_url ? String(row.badge_url) : "";
      if (externalId && badge.startsWith("http")) badges[externalId] = badge;
      const name = String(row.name ?? "").toLowerCase();
      if (name && badge.startsWith("http")) badges[name] = badge;
    }

    await cacheSet("sports:badges", badges, 86400);
    res.json(badges);
  } catch (err) {
    console.error("[sports/badges]", err);
    res.status(500).json({ error: "Failed to load league badges" });
  }
});

router.get("/teams", async (req, res) => {
  try {
    const db = await getDb();
    const leagueId = req.query.leagueId ? String(req.query.leagueId) : undefined;
    let result;
    if (leagueId) {
      result = await db.query(
        `SELECT id, external_id, name, short_name, badge_url, league_id, league_name, sport, country FROM sports_teams WHERE league_id = ? ORDER BY name ASC`,
        [leagueId]
      );
    } else {
      result = await db.query(
        `SELECT id, external_id, name, short_name, badge_url, league_id, league_name, sport, country FROM sports_teams ORDER BY name ASC LIMIT 100`
      );
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to load teams" });
  }
});

router.get("/standings", async (req, res) => {
  try {
    const leagueId = Number(req.query.leagueId || req.query.league);
    const season = Number(req.query.season) || currentFootballSeason();

    if (!Number.isFinite(leagueId) || leagueId <= 0) {
      return res.status(400).json({ error: "leagueId query parameter required" });
    }

    const cacheKey = `apifootball:standings:public:${leagueId}:${season}`;
    const cached = await cacheGet<unknown[]>(cacheKey);
    if (cached) return res.json({ leagueId, season, standings: cached, cached: true });

    const settings = await getApiFootballSettings();
    if (!settings.enabled) {
      return res.json({ leagueId, season, standings: [], cached: false, message: "API-Sports not configured" });
    }

    const { fetchStandings } = await import("../lib/apifootball/client");
    const standings = await fetchStandings(settings.apiKey, leagueId, season);
    await cacheSet(cacheKey, standings, 3600);

    const league = API_FOOTBALL_LEAGUES.find((l) => l.apiId === leagueId);
    res.json({
      leagueId,
      leagueName: league?.name,
      season,
      standings,
      cached: false,
    });
  } catch (err) {
    console.error("[sports/standings]", err);
    const leagueId = Number(req.query.leagueId || req.query.league);
    const season = Number(req.query.season) || currentFootballSeason();
    const stale = await cacheGet<unknown[]>(`apifootball:standings:public:${leagueId}:${season}`);
    if (stale) {
      return res.json({ leagueId, season, standings: stale, cached: true, fallback: true });
    }
    res.json({
      leagueId,
      season,
      standings: [],
      cached: false,
      fallback: true,
      message: "Standings temporarily unavailable",
    });
  }
});

export default router;
