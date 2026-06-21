import type { Match } from "@/lib/constants";
import { FOOTBALL_COMPETITIONS } from "@/lib/constants";

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function filterMatchesBySearch(matches: Match[], search: string): Match[] {
  const q = search.trim().toLowerCase();
  if (!q) return matches;
  return matches.filter(
    (m) =>
      m.homeTeam.name.toLowerCase().includes(q) ||
      m.awayTeam.name.toLowerCase().includes(q) ||
      m.league.toLowerCase().includes(q)
  );
}

export function filterMatchesByLeague(matches: Match[], leagueId: string): Match[] {
  if (!leagueId || leagueId === "all") return matches;

  const competition = FOOTBALL_COMPETITIONS.find((c) => c.id === leagueId);
  if (competition && competition.id !== "all") {
    const label = competition.label.toLowerCase();
    return matches.filter((m) => {
      const leagueName = m.league.toLowerCase();
      return (
        leagueName.includes(label) ||
        label.includes(leagueName) ||
        m.leagueId.includes(label.replace(/[^a-z0-9]+/g, "-"))
      );
    });
  }

  const q = leagueId.toLowerCase();
  return matches.filter(
    (m) =>
      m.leagueId === q ||
      m.league.toLowerCase().includes(q) ||
      m.leagueId.includes(q.replace(/[^a-z0-9-]/g, ""))
  );
}

export function getLiveMatches(matches: Match[]): Match[] {
  return matches.filter((m) => m.isLive || m.matchStatus === "live");
}

export function getTodayMatches(matches: Match[]): Match[] {
  const today = startOfDay(new Date());
  return matches
    .filter((m) => isSameDay(m.startTime, today) && m.matchStatus !== "finished")
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}

export function getTomorrowMatches(matches: Match[]): Match[] {
  const tomorrow = startOfDay(new Date());
  tomorrow.setDate(tomorrow.getDate() + 1);
  return matches
    .filter((m) => isSameDay(m.startTime, tomorrow) && m.matchStatus !== "finished")
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}

export function getUpcomingMatches(matches: Match[]): Match[] {
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);
  weekEnd.setHours(23, 59, 59, 999);
  return matches
    .filter(
      (m) =>
        m.matchStatus === "upcoming" &&
        !m.isLive &&
        m.startTime >= now &&
        m.startTime <= weekEnd
    )
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}

export function getWeekMatches(matches: Match[]): Match[] {
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);
  weekEnd.setHours(23, 59, 59, 999);
  return matches
    .filter((m) => m.startTime >= now && m.startTime <= weekEnd && m.matchStatus !== "finished")
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}
