import { syncApiFootballLiveScores } from "../lib/apifootball/live-sync";
import { getApiFootballSettings } from "../lib/apifootball/settings";

let handle: ReturnType<typeof setInterval> | null = null;

export async function startApiFootballSyncScheduler(): Promise<void> {
  if (handle) return;

  const schedule = async () => {
    const settings = await getApiFootballSettings();
    if (!settings.enabled) return;

    try {
      const result = await syncApiFootballLiveScores();
      if (result.updated > 0 || result.finished > 0) {
        console.log(
          `[apifootball] updated=${result.updated} finished=${result.finished}${result.message ? ` (${result.message})` : ""}`
        );
      }
    } catch (err) {
      console.error("[apifootball] scheduler error:", err);
    }
  };

  const settings = await getApiFootballSettings();
  const intervalMs = settings.refreshIntervalMs;

  void schedule();
  handle = setInterval(schedule, intervalMs);
  console.log(`[apifootball] Live score sync started (${intervalMs / 1000}s interval)`);
}
