import { getDb } from "../../db";
import { invalidateMatchCache } from "../matches";
import { fetchLiveFixtures } from "./client";
import { upsertApiFootballFixture, syncApiFootballFixtures } from "./fixture-sync";
import { getApiFootballSettings } from "./settings";
import { API_FOOTBALL_LEAGUES, currentFootballSeason } from "./leagues";
import { fetchStandings } from "./client";
import { cacheSet } from "../../services/redis";

function dateRange(daysAhead: number): string[] {
  const dates: string[] = [];
  const base = new Date();
  for (let i = 0; i <= daysAhead; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

let lastStandingsSync = 0;
const STANDINGS_INTERVAL_MS = 30 * 60 * 1000;

async function syncStandingsCache(apiKey: string): Promise<number> {
  const now = Date.now();
  if (now - lastStandingsSync < STANDINGS_INTERVAL_MS) return 0;

  const season = currentFootballSeason();
  let synced = 0;

  for (const league of API_FOOTBALL_LEAGUES.slice(0, 6)) {
    try {
      const rows = await fetchStandings(apiKey, league.apiId, season);
      if (rows.length > 0) {
        await cacheSet(`apifootball:standings:public:${league.apiId}:${season}`, rows, 3600);
        synced += 1;
      }
    } catch (err) {
      console.warn(`[apifootball] standings league=${league.apiId} failed:`, err instanceof Error ? err.message : err);
    }
  }

  lastStandingsSync = now;
  return synced;
}

export async function syncApiFootballAll(): Promise<{
  ok: boolean;
  live: number;
  imported: number;
  updated: number;
  finished: number;
  standings: number;
  message?: string;
}> {
  const settings = await getApiFootballSettings();
  if (!settings.enabled) {
    return {
      ok: false,
      live: 0,
      imported: 0,
      updated: 0,
      finished: 0,
      standings: 0,
      message: "APIFOOTBALL_API_KEY not configured",
    };
  }

  const db = await getDb();
  let liveCount = 0;
  let imported = 0;
  let updated = 0;
  let finished = 0;

  try {
    const liveFixtures = await fetchLiveFixtures(settings.apiKey);
    for (const fx of liveFixtures) {
      const result = await upsertApiFootballFixture(db, fx, {
        fetchCards: true,
        apiKey: settings.apiKey,
      });
      if (result.action === "created") imported += 1;
      if (result.action === "updated") liveCount += 1;
      if (result.action === "finished") finished += 1;
    }

    const fixtureResult = await syncApiFootballFixtures(settings.apiKey, dateRange(7));
    imported += fixtureResult.imported;
    updated += fixtureResult.updated;
    finished += fixtureResult.finished;

    const standings = await syncStandingsCache(settings.apiKey);

    if (liveCount > 0 || imported > 0 || updated > 0 || finished > 0) {
      await invalidateMatchCache();
    }

    console.log(
      `[apifootball] sync live=${liveCount} imported=${imported} updated=${updated} finished=${finished} standings=${standings}`
    );

    return { ok: true, live: liveCount, imported, updated, finished, standings };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[apifootball] sync failed:", message);
    return {
      ok: false,
      live: liveCount,
      imported,
      updated,
      finished,
      standings: 0,
      message,
    };
  }
}

/** @deprecated use syncApiFootballAll */
export async function syncApiFootballLiveScores() {
  const result = await syncApiFootballAll();
  return {
    updated: result.live + result.updated,
    finished: result.finished,
    unavailable: !result.ok,
    message: result.message,
  };
}
