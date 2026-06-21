import { Router } from "express";
import { listMatches } from "../lib/matches";
import { cacheGet, cacheSet } from "../services/redis";

const router = Router();

router.get("/", async (req, res) => {
  const { sport, live, featured } = req.query;
  const cacheKey = `matches:${sport || "all"}:${live || "all"}:${featured || "all"}`;
  const cached = await cacheGet<unknown[]>(cacheKey);
  if (cached) return res.json(cached);

  const matches = await listMatches({
    sport: sport ? String(sport) : undefined,
    live: live === "true" ? true : undefined,
    featured: featured === "true" ? true : undefined,
  });

  await cacheSet(cacheKey, matches, 30);
  res.json(matches);
});

export default router;
