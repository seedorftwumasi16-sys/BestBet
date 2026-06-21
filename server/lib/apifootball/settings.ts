import { getDb } from "../../db";

export const APIFOOTBALL_SETTINGS = {
  apiKey: "apifootball_api_key",
  refreshIntervalSec: "apifootball_refresh_interval",
} as const;

const DEFAULT_REFRESH_SEC = 60;

/** API key is read from server env first — never exposed to the frontend. */
export function getApiKeyFromEnv(): string {
  return (
    process.env.APIFOOTBALL_API_KEY?.trim() ||
    process.env.API_SPORTS_KEY?.trim() ||
    ""
  );
}

export async function getApiFootballSettings(): Promise<{
  apiKey: string;
  refreshIntervalMs: number;
  enabled: boolean;
  source: "env" | "database" | "none";
}> {
  const envKey = getApiKeyFromEnv();
  if (envKey) {
    const refreshSec = Math.max(
      30,
      Math.min(60, Number(process.env.APIFOOTBALL_REFRESH_SEC || DEFAULT_REFRESH_SEC) || DEFAULT_REFRESH_SEC)
    );
    return {
      apiKey: envKey,
      refreshIntervalMs: refreshSec * 1000,
      enabled: true,
      source: "env",
    };
  }

  const db = await getDb();
  const result = await db.query(
    `SELECT key, value FROM site_settings WHERE key IN (?, ?)`,
    [APIFOOTBALL_SETTINGS.apiKey, APIFOOTBALL_SETTINGS.refreshIntervalSec]
  );
  const map = Object.fromEntries(result.rows.map((r) => [String(r.key), String(r.value ?? "")]));
  const apiKey = (map[APIFOOTBALL_SETTINGS.apiKey] || "").trim();
  const refreshSec = Math.max(
    30,
    Math.min(60, Number(map[APIFOOTBALL_SETTINGS.refreshIntervalSec] || DEFAULT_REFRESH_SEC) || DEFAULT_REFRESH_SEC)
  );
  return {
    apiKey,
    refreshIntervalMs: refreshSec * 1000,
    enabled: Boolean(apiKey),
    source: apiKey ? "database" : "none",
  };
}

export async function saveApiFootballSettings(apiKey: string, refreshIntervalSec: number): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  const interval = String(Math.max(30, Math.min(60, refreshIntervalSec || DEFAULT_REFRESH_SEC)));

  for (const [key, value] of [
    [APIFOOTBALL_SETTINGS.apiKey, apiKey.trim()],
    [APIFOOTBALL_SETTINGS.refreshIntervalSec, interval],
  ] as const) {
    const existing = await db.query(`SELECT key FROM site_settings WHERE key = ?`, [key]);
    if (existing.rows.length > 0) {
      await db.query(`UPDATE site_settings SET value = ?, updated_at = ? WHERE key = ?`, [value, now, key]);
    } else {
      await db.query(`INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, ?)`, [key, value, now]);
    }
  }
}
