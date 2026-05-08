import { formatClock } from "../hooks/useTimer";
import { ExerciseLog, Set } from "../types";
import { isLoggedSet } from "./activeSession";
import { getExerciseMeta } from "./metrics";

export const NO_VALUES = "—";

export function exerciseProgress(exercise: ExerciseLog): { done: number; total: number } {
  return { done: exercise.sets.filter(isLoggedSet).length, total: exercise.sets.length };
}

// The first exercise with nothing logged yet; null once every exercise has a set.
export function currentExerciseId(exercises: ExerciseLog[]): string | null {
  return exercises.find((ex) => !ex.sets.some(isLoggedSet))?.id ?? null;
}

function formatSet(set: Set, exercise: ExerciseLog): string {
  const meta = getExerciseMeta(exercise);
  if (meta.trackingType === "time") {
    const parts = [];
    if (Number(set.duration) > 0) parts.push(formatClock(Number(set.duration) * 1000));
    if (parseFloat(set.distance || "") > 0) parts.push(`${set.distance} ${meta.distanceUnit}`);
    return parts.join(" · ");
  }
  const reps = parseInt(set.reps) > 0 ? set.reps : "";
  if (parseFloat(set.weight) > 0) return reps ? `${set.weight} kg × ${reps}` : `${set.weight} kg`;
  return reps ? `${reps} reps` : "";
}

// The last logged set of this session, e.g. "60 kg × 8", or a dash when there is none.
export function lastValues(exercise: ExerciseLog): string {
  const last = exercise.sets.findLast(isLoggedSet);
  return (last && formatSet(last, exercise)) || NO_VALUES;
}
