import { promoteKickoffMatches } from "../lib/kickoff-scheduler";

const TICK_MS = 60_000;
let handle: ReturnType<typeof setInterval> | null = null;

export function startKickoffScheduler(): void {
  if (handle) return;

  const run = async () => {
    try {
      const result = await promoteKickoffMatches();
      if (result.promoted > 0 || result.finished > 0) {
        console.log(`[kickoff] promoted=${result.promoted} finished=${result.finished}`);
      }
    } catch (err) {
      console.error("[kickoff] scheduler failed:", err);
    }
  };

  void run();
  handle = setInterval(run, TICK_MS);
  console.log("[kickoff] Scheduler started (60s interval)");
}
