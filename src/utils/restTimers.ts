import { clearTimer, readRunningTimer } from "../hooks/useTimer";
import { ExerciseLog } from "../types";

export const restTimerId = (setId: string) => `${setId}-rest`;

export interface RunningRest {
  exerciseId: string;
  exerciseName: string;
  remainingMs: number;
  overtimeMs: number;
}

// The rest that started most recently, if any set of the session has one running.
export function findRunningRest(exercises: ExerciseLog[], now: number): RunningRest | null {
  let latest: { startedAt: number; rest: RunningRest } | null = null;
  for (const exercise of exercises) {
    for (const set of exercise.sets) {
      const timer = readRunningTimer(restTimerId(set.id), now);
      if (timer && (!latest || timer.startedAt > latest.startedAt)) {
        latest = {
          startedAt: timer.startedAt,
          rest: { exerciseId: exercise.id, exerciseName: exercise.name, remainingMs: timer.remainingMs, overtimeMs: timer.overtimeMs },
        };
      }
    }
  }
  return latest?.rest ?? null;
}

// A rest belongs to its session; once the session is saved or cancelled its
// timers must not resurface when the saved session is edited again.
export function clearSessionRests(exercises: ExerciseLog[]) {
  for (const exercise of exercises) {
    for (const set of exercise.sets) clearTimer(restTimerId(set.id));
  }
}
