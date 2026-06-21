import { tickLiveMatchTimers, syncComputedHalftimeStates } from "../lib/match-timer";

const TICK_MS = 60_000;

let timerHandle: ReturnType<typeof setInterval> | null = null;

export function startMatchTimerScheduler(): void {
  if (timerHandle) return;

  const run = async () => {
    try {
      await syncComputedHalftimeStates();
      const count = await tickLiveMatchTimers();
      if (count > 0) {
        console.log(`[match-timer] Updated ${count} live match(es)`);
      }
    } catch (err) {
      console.error("[match-timer] tick failed:", err);
    }
  };

  void run();
  timerHandle = setInterval(run, TICK_MS);
  console.log("[match-timer] Scheduler started (60s interval)");
}

export function stopMatchTimerScheduler(): void {
  if (timerHandle) {
    clearInterval(timerHandle);
    timerHandle = null;
  }
}
