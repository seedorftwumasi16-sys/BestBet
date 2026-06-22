import type { Match } from "@/lib/constants";
import { isFinishedMatch } from "@/lib/match-status";

export type ResultsTab = "today" | "yesterday" | "week" | "all";

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

export function getFinishedMatches(matches: Match[]): Match[] {
  return matches
    .filter(isFinishedMatch)
    .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
}

export function filterResultsByTab(matches: Match[], tab: ResultsTab): Match[] {
  const now = new Date();
  const today = startOfDay(now);

  if (tab === "all") return matches;

  if (tab === "today") {
    return matches.filter((m) => isSameDay(m.startTime, today));
  }

  if (tab === "yesterday") {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return matches.filter((m) => isSameDay(m.startTime, yesterday));
  }

  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - 7);
  return matches.filter((m) => m.startTime >= weekStart && m.startTime <= now);
}

export function groupResultsByDate(matches: Match[]): { label: string; matches: Match[] }[] {
  const groups = new Map<string, Match[]>();

  for (const match of matches) {
    const key = match.startTime.toLocaleDateString(undefined, {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const list = groups.get(key) ?? [];
    list.push(match);
    groups.set(key, list);
  }

  return Array.from(groups.entries()).map(([label, groupMatches]) => ({
    label,
    matches: groupMatches,
  }));
}
