import { Router } from "express";
import { getDb } from "../db";
import { getLastSyncStatus } from "../lib/sportsdb/sync";
import { pingSportsApi, getSportsApiKey } from "../lib/sportsdb/client";
import { cacheGet, cacheSet } from "../services/redis";

const router = Router();

router.get("/status", async (_req, res) => {
  try {
    const db = await getDb();
    let lastSync = null;
    try {
      lastSync = await getLastSyncStatus(db);
    } catch {
      lastSync = null;
    }
    const apiReachable = await pingSportsApi();

    let leaguesCount = 0;
    let teamsCount = 0;
    let syncedMatchesCount = 0;
    try {
      const leagues = await db.query(`SELECT id FROM leagues LIMIT 1`);
      leaguesCount = leagues.rows.length;
      const teams = await db.query(`SELECT COUNT(*) as count FROM sports_teams`);
      teamsCount = Number(teams.rows[0]?.count ?? 0);
      const syncedMatches = await db.query(`SELECT COUNT(*) as count FROM matches WHERE external_event_id IS NOT NULL`);
      syncedMatchesCount = Number(syncedMatches.rows[0]?.count ?? 0);
    } catch {
      /* tables may not exist yet during first deploy */
    }

    const leagues = await db.query(
      `SELECT id, name, sport, badge_url, external_id FROM leagues ORDER BY name ASC LIMIT 50`
    ).catch(() => ({ rows: [] }));

    res.json({
      provider: "thesportsdb",
      apiKeyConfigured: Boolean(getSportsApiKey()),
      apiReachable,
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
    const { LEAGUE_BADGE_BY_SPORTSDB_ID, DEFAULT_LEAGUE_BADGE } = await import("../lib/sportsdb/badges");
    const cached = await cacheGet<Record<string, string>>("sports:badges");
    if (cached) return res.json(cached);

    const fromDb = await db.query(
      `SELECT external_id, name, badge_url FROM leagues WHERE badge_url IS NOT NULL`
    ).catch(() => ({ rows: [] as Record<string, unknown>[] }));

    const badges: Record<string, string> = { ...LEAGUE_BADGE_BY_SPORTSDB_ID, default: DEFAULT_LEAGUE_BADGE };
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

export default router;
