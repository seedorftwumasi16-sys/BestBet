import { syncSportsData } from "../lib/sportsdb/sync";

const SYNC_INTERVAL_MS = 5 * 60 * 1000;

let syncRunning = false;
let intervalHandle: ReturnType<typeof setInterval> | null = null;

async function runSync(label: string) {
  if (syncRunning) {
    console.log(`[sports-sync] Skipping ${label} — previous sync still running`);
    return;
  }
  syncRunning = true;
  try {
    await syncSportsData();
  } finally {
    syncRunning = false;
  }
}

/** Start TheSportsDB auto-sync every 5 minutes. Runs once immediately on startup. */
export function startSportsSyncScheduler() {
  if (intervalHandle) return;

  console.log("[sports-sync] Scheduler started (interval: 5 minutes)");

  setTimeout(() => {
    runSync("startup").catch((err) => console.error("[sports-sync] startup error:", err));
  }, 5000);

  intervalHandle = setInterval(() => {
    runSync("interval").catch((err) => console.error("[sports-sync] interval error:", err));
  }, SYNC_INTERVAL_MS);
}

export function stopSportsSyncScheduler() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}
