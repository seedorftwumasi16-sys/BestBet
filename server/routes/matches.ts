import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db";
import { authenticate, requirePermission, logAudit } from "../middleware/auth";
import { boolFrom } from "../db/helpers";
import { cacheGet, cacheSet } from "../services/redis";

const router = Router();

router.get("/", async (req, res) => {
  const { sport, live } = req.query;
  const cacheKey = `matches:${sport || "all"}:${live || "all"}`;
  const cached = await cacheGet<unknown[]>(cacheKey);
  if (cached) return res.json(cached);

  const db = await getDb();
  let result = await db.query(`SELECT * FROM matches ORDER BY is_live DESC, start_time ASC`);
  let rows = result.rows;

  if (sport) rows = rows.filter((m) => m.sport === sport);
  if (live === "true") rows = rows.filter((m) => boolFrom(m, "is_live"));

  const matches = rows.map((m) => ({
    id: m.id,
    homeTeam: { name: m.home_team, shortName: String(m.home_team).slice(0, 3).toUpperCase(), logo: "⚽" },
    awayTeam: { name: m.away_team, shortName: String(m.away_team).slice(0, 3).toUpperCase(), logo: "⚽" },
    league: m.league,
    leagueId: String(m.league).toLowerCase().replace(/\s+/g, "-"),
    sport: m.sport,
    startTime: m.start_time,
    isLive: boolFrom(m, "is_live"),
    liveMinute: m.live_minute,
    homeScore: m.home_score,
    awayScore: m.away_score,
    odds: { home: Number(m.odds_home), draw: m.odds_draw ? Number(m.odds_draw) : undefined, away: Number(m.odds_away) },
  }));

  await cacheSet(cacheKey, matches, 30);
  res.json(matches);
});

router.get("/leagues", async (_req, res) => {
  const db = await getDb();
  const result = await db.query(`SELECT * FROM leagues WHERE active = 1 OR active = true`);
  res.json(result.rows);
});

router.post("/", authenticate, requirePermission("manage_matches"), async (req, res) => {
  const { homeTeam, awayTeam, league, sport, startTime, oddsHome, oddsDraw, oddsAway, isLive } = req.body;
  if (!homeTeam || !awayTeam || !league || !sport) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const db = await getDb();
  const id = uuidv4();
  await db.query(
    `INSERT INTO matches (id, home_team, away_team, league, sport, start_time, is_live, odds_home, odds_draw, odds_away)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, homeTeam, awayTeam, league, sport, startTime || new Date().toISOString(), isLive ? 1 : 0, oddsHome || 1.5, oddsDraw || null, oddsAway || 2.5]
  );
  await logAudit(req.user!.id, "create_match", `Created match ${homeTeam} vs ${awayTeam}`);
  res.status(201).json({ id });
});

router.patch("/:id/odds", authenticate, requirePermission("manage_odds"), async (req, res) => {
  const { oddsHome, oddsDraw, oddsAway } = req.body;
  const db = await getDb();
  const match = await db.query(`SELECT id FROM matches WHERE id = ?`, [req.params.id]);
  if (match.rows.length === 0) return res.status(404).json({ error: "Match not found" });

  await db.query(
    `UPDATE matches SET odds_home = ?, odds_draw = ?, odds_away = ? WHERE id = ?`,
    [oddsHome, oddsDraw ?? null, oddsAway, req.params.id]
  );
  await logAudit(req.user!.id, "update_odds", `Updated odds for match ${req.params.id}`);
  res.json({ message: "Odds updated" });
});

router.delete("/:id", authenticate, requirePermission("manage_matches"), async (req, res) => {
  const db = await getDb();
  await db.query(`DELETE FROM matches WHERE id = ?`, [req.params.id]);
  await logAudit(req.user!.id, "delete_match", `Deleted match ${req.params.id}`);
  res.json({ message: "Match deleted" });
});

export default router;
