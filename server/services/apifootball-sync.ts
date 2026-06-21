import { syncApiFootballAll } from "../lib/apifootball/sync";
import { getApiFootballSettings } from "../lib/apifootball/settings";

let handle: ReturnType<typeof setInterval> | null = null;
const SYNC_INTERVAL_MS = 60_000;

export async function startApiFootballSyncScheduler(): Promise<void> {
  if (handle) return;

  const run = async () => {
    const settings = await getApiFootballSettings();
    if (!settings.enabled) {
      console.log("[apifootball] Skipping sync — set APIFOOTBALL_API_KEY on the server");
      return;
    }

    try {
      await syncApiFootballAll();
    } catch (err) {
      console.error("[apifootball] scheduler error:", err);
    }
  };

  void run();
  handle = setInterval(run, SYNC_INTERVAL_MS);
  console.log(`[apifootball] API-Sports sync started (every ${SYNC_INTERVAL_MS / 1000}s)`);
}
