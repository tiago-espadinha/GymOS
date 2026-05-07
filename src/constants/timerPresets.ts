import { ExerciseCategory } from "../types";

export type TimerPhase = "work" | "rest";

// Preset durations (seconds) offered per category + phase. "work" presets are
// used for the primary timer (an isometric hold, a cardio interval/steady
// run); "rest" presets are used for the recovery timer chained after it, and
// also for the standalone rest timer offered on plain reps-based sets.
export const DEFAULT_PRESETS: Record<ExerciseCategory, Record<TimerPhase, number[]>> = {
  strength: {
    work: [30, 45, 60, 90],
    rest: [60, 90, 120, 180],
  },
  calisthenics: {
    work: [15, 20, 30, 45, 60],
    rest: [30, 45, 60, 90],
  },
  cardio: {
    work: [300, 600, 900, 1200, 1800],
    rest: [15, 30, 45, 60, 90],
  },
};

// Formats a whole number of seconds as a short chip label, e.g. 45 -> "45s",
// 90 -> "1m30s", 600 -> "10m".
export function formatPresetLabel(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m}m` : `${m}m${s}s`;
}

// The +/- adjustment step should feel proportional to how long the timer
// already is: nudging a 30s isometric hold by 5s is meaningful, nudging a
// 20-minute cardio timer by 5s is not. Recomputed live from the *current*
// target, so the step grows/shrinks automatically as the target changes.
export function getAdjustStepSec(targetSec: number): number {
  if (targetSec < 60) return 5; // short calisthenics/strength holds (~30s)
  if (targetSec < 300) return 15; // typical rest periods, longer holds (1-5min)
  return 30; // cardio work durations (5-30min+)
}
