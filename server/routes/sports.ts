import { Router } from "express";
import { getDb } from "../db";
import { getLastSyncStatus } from "../lib/sportsdb/sync";
import { pingSportsApi, getSportsApiKey } from "../lib/sportsdb/client";

const router = Router();

router.get("/status", async (_req, res) => {
  try {
    const db = await getDb();
    const lastSync = await getLastSyncStatus(db);
    const apiReachable = await pingSportsApi();

    const leagues = await db.query(`SELECT id, name, sport, badge_url, external_id FROM leagues WHERE active = 1 OR active = true ORDER BY name ASC LIMIT 50`);
    const teams = await db.query(`SELECT COUNT(*) as count FROM sports_teams`);
    const syncedMatches = await db.query(`SELECT COUNT(*) as count FROM matches WHERE external_event_id IS NOT NULL`);

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
        teams: Number(teams.rows[0]?.count ?? 0),
        syncedMatches: Number(syncedMatches.rows[0]?.count ?? 0),
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
