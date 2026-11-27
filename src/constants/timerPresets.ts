import { ExerciseCategory } from "../types";

// Target chips offered for a hold or a cardio effort.
export const WORK_PRESETS: Record<ExerciseCategory, number[]> = {
  strength: [30, 45, 60, 90],
  calisthenics: [15, 20, 30, 45, 60],
  cardio: [300, 600, 900, 1200, 1800],
};

// The rest after a set until Settings says otherwise.
export const DEFAULT_REST_SEC: Record<ExerciseCategory, number> = {
  strength: 60,
  calisthenics: 30,
  cardio: 15,
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
