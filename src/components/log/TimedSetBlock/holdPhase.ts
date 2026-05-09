import type { TimerControls } from "../../../hooks/useTimer";

// ready: not started; over: running past the target (only with the rest off).
export type HoldPhase = "ready" | "running" | "paused" | "over";

export function holdPhase({ isRunning, elapsedMs, isComplete }: TimerControls): HoldPhase {
  if (!isRunning) return elapsedMs > 0 ? "paused" : "ready";
  return isComplete ? "over" : "running";
}
