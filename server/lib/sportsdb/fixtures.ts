import type { SportsDbEvent } from "./types";
import {
  TRACKED_LEAGUE_IDS,
  TRACKED_LEAGUES,
  isTrackedLeagueId,
  isTrackedLeagueName,
} from "./leagues";
import {
  fetchNextFixtures,
  fetchSeasonFixtures,
  fetchTodayFixtures,
  currentFootballSeasons,
  sleep,
} from "./client";

const FIXTURE_LOOKAHEAD_DAYS = 7;

export interface FixtureFetchReport {
  eventMap: Map<string, SportsDbEvent>;
  logs: string[];
  totalRaw: number;
  totalTracked: number;
}

function isWithinFixtureWindow(event: SportsDbEvent): boolean {
  const start = event.strTimestamp
    ? new Date(event.strTimestamp)
    : new Date(`${event.dateEvent}T${event.strTime || "12:00:00"}Z`);
  if (Number.isNaN(start.getTime())) return true;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setDate(end.getDate() + FIXTURE_LOOKAHEAD_DAYS);
  end.setHours(23, 59, 59, 999);

  const dayBefore = new Date(now);
  dayBefore.setDate(dayBefore.getDate() - 1);

  return start >= dayBefore && start <= end;
}

export function isTrackedFixture(event: SportsDbEvent): boolean {
  if (String(event.strSport).toLowerCase() !== "soccer") return false;
  return isTrackedLeagueId(event.idLeague) || isTrackedLeagueName(event.strLeague);
}

function addEvents(
  eventMap: Map<string, SportsDbEvent>,
  events: SportsDbEvent[],
  options?: { requireWindow?: boolean; requireTracked?: boolean }
): number {
  let added = 0;
  for (const event of events) {
    if (options?.requireTracked && !isTrackedFixture(event)) continue;
    if (options?.requireWindow && !isWithinFixtureWindow(event)) continue;
    const id = String(event.idEvent);
    if (!eventMap.has(id)) added += 1;
    eventMap.set(id, event);
  }
  return added;
}

export async function collectFixturesFromAllSources(): Promise<FixtureFetchReport> {
  const eventMap = new Map<string, SportsDbEvent>();
  const logs: string[] = [];
  let totalRaw = 0;

  for (let offset = 0; offset <= FIXTURE_LOOKAHEAD_DAYS; offset++) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    const dayLabel = date.toISOString().slice(0, 10);
    const dayEvents = await fetchTodayFixtures(date, "Soccer");
    totalRaw += dayEvents.length;
    const tracked = dayEvents.filter(isTrackedFixture);
    const added = addEvents(eventMap, dayEvents, { requireTracked: true });
    logs.push(`eventsday ${dayLabel}: ${dayEvents.length} raw, ${tracked.length} tracked, +${added} new (total ${eventMap.size})`);
    await sleep(120);
  }

  for (const league of TRACKED_LEAGUES) {
    const nextEvents = await fetchNextFixtures(league.id);
    totalRaw += nextEvents.length;
    const added = addEvents(eventMap, nextEvents);
    logs.push(`eventsnextleague ${league.name} (${league.id}): ${nextEvents.length} raw, +${added} new (total ${eventMap.size})`);
    await sleep(120);
  }

  const seasons = currentFootballSeasons();
  for (const leagueId of TRACKED_LEAGUE_IDS) {
    for (const season of seasons) {
      const seasonEvents = await fetchSeasonFixtures(leagueId, season);
      totalRaw += seasonEvents.length;
      const inWindow = seasonEvents.filter(isWithinFixtureWindow);
      const added = addEvents(eventMap, inWindow);
      if (seasonEvents.length > 0) {
        logs.push(
          `eventsseason ${leagueId} ${season}: ${seasonEvents.length} raw, ${inWindow.length} in window, +${added} new (total ${eventMap.size})`
        );
      }
      await sleep(120);
      if (eventMap.size >= 50) break;
    }
    if (eventMap.size >= 50) break;
  }

  const totalTracked = eventMap.size;
  logs.push(`MERGE COMPLETE: ${totalTracked} unique fixtures from ${totalRaw} raw API rows across all sources`);

  if (totalTracked < 50) {
    logs.push(
      `WARNING: Only ${totalTracked} fixtures collected (target 50+). Free API tier may return limited data — consider a premium SPORTS_API_KEY.`
    );
  }

  for (const line of logs) {
    console.log(`[sports-sync] ${line}`);
  }

  return { eventMap, logs, totalRaw, totalTracked };
}
