import { Router } from "express";
import { listMatches, type FixtureWindow } from "../lib/matches";
import { cacheGet, cacheSet } from "../services/redis";

const router = Router();

router.get("/", async (req, res) => {
  const { sport, live, featured, league, search, window } = req.query;
  const validWindows = new Set(["live", "today", "tomorrow", "upcoming", "week"]);
  const isLiveQuery = live === "true";
  const cacheKey = `matches:v3:${sport || "all"}:${live || "all"}:${featured || "all"}:${league || "all"}:${search || "all"}:${window || "all"}`;

  if (!isLiveQuery) {
    const cached = await cacheGet<unknown[]>(cacheKey);
    if (cached) return res.json(cached);
  }

  const matches = await listMatches({
    sport: sport ? String(sport) : undefined,
    live: isLiveQuery ? true : undefined,
    featured: featured === "true" ? true : undefined,
    league: league ? String(league) : undefined,
    search: search ? String(search) : undefined,
    window: window && validWindows.has(String(window)) ? (String(window) as FixtureWindow) : undefined,
  });

  if (!isLiveQuery) {
    await cacheSet(cacheKey, matches, 30);
  }
  res.json(matches);
});

export default router;
