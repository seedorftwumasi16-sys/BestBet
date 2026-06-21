import type { Database } from "../db";
import { isHttpLogo } from "./sportsdb/badges";

function normalizeTeamName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

export async function lookupTeamBadge(db: Database, teamName: string): Promise<string | null> {
  const normalized = normalizeTeamName(teamName);
  if (!normalized) return null;

  try {
    const exact = await db.query(
      `SELECT badge_url FROM sports_teams WHERE LOWER(name) = ? OR LOWER(short_name) = ? LIMIT 1`,
      [normalized, normalized.slice(0, 3)]
    );
    const exactBadge = exact.rows[0]?.badge_url;
    if (isHttpLogo(exactBadge)) return String(exactBadge);

    const fuzzy = await db.query(`SELECT name, badge_url FROM sports_teams LIMIT 500`);
    for (const row of fuzzy.rows) {
      const rowName = normalizeTeamName(String(row.name ?? ""));
      const badge = row.badge_url;
      if (!isHttpLogo(badge)) continue;
      if (rowName === normalized || rowName.includes(normalized) || normalized.includes(rowName)) {
        return String(badge);
      }
    }
  } catch {
    // sports_teams table may not exist yet
  }

  return null;
}

export async function resolveTeamLogo(
  db: Database,
  teamName: string,
  storedLogo?: string | null
): Promise<string> {
  if (isHttpLogo(storedLogo)) return storedLogo;
  const badge = await lookupTeamBadge(db, teamName);
  return badge ?? "⚽";
}
