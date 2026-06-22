import { tickLiveMatchTimers, syncComputedHalftimeStates, cleanupStaleLiveMatches } from "../lib/match-timer";
import { tickSimulatedMatchScores, resumeSimulatedSecondHalves } from "../lib/simulated-score";
import { promoteKickoffMatches } from "../lib/kickoff-scheduler";

const TICK_MS = 30_000;

let timerHandle: ReturnType<typeof setInterval> | null = null;

export function startMatchTimerScheduler(): void {
  if (timerHandle) return;

  const run = async () => {
    try {
      const kickoff = await promoteKickoffMatches();
      await cleanupStaleLiveMatches();
      await syncComputedHalftimeStates();
      await resumeSimulatedSecondHalves();
      const scoreUpdates = await tickSimulatedMatchScores();
      const count = await tickLiveMatchTimers();
      if (kickoff.promoted > 0 || count > 0 || scoreUpdates > 0) {
        console.log(
          `[match-scheduler] kickoff=${kickoff.promoted} timers=${count} simulatedGoals=${scoreUpdates}`
        );
      }
    } catch (err) {
      console.error("[match-scheduler] tick failed:", err);
    }
  };

  void run();
  timerHandle = setInterval(run, TICK_MS);
  console.log("[match-scheduler] Started (30s interval — kickoff, timers, auto-finish)");
}

export function stopMatchTimerScheduler(): void {
  if (timerHandle) {
    clearInterval(timerHandle);
    timerHandle = null;
  }
}
