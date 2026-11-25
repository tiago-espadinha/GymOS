import { ExerciseLog, Set, WorkoutSession } from "../types";
import { isLoggedSet } from "./activeSession";
import { generateId } from "./id";
import type { WeightUnit } from "./unitPrefs";
import { storedWeight, weightText } from "./units";

// The set being entered: the first one with nothing logged. When every set is
// logged the next one is virtual (index === sets.length) until it is logged.
export function currentSetIndex(exercise: ExerciseLog): number {
  const pending = exercise.sets.findIndex((s) => !isLoggedSet(s));
  return pending === -1 ? exercise.sets.length : pending;
}

// A virtual timed set's hold needs an id before the set exists, stable across
// reloads and row removals so a running hold is found again. A logged hold gets
// its own id, so at most one set carries this one.
export const virtualSetId = (exercise: ExerciseLog) => `${exercise.id}-next`;

// True once every exercise has at least one logged set (plans have no target set count).
export function allExercisesDone(exercises: ExerciseLog[]): boolean {
  return exercises.length > 0 && exercises.every((ex) => ex.sets.some(isLoggedSet));
}

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

// The logged sets of this exercise in the most recent saved session that has it.
// `excludeId` leaves out the session being edited, so it is not its own history.
export function lastTimeSets(sessions: WorkoutSession[], name: string, excludeId?: string): Set[] {
  let best: { date: string; sets: Set[] } | null = null;
  for (const session of sessions) {
    if (session.id === excludeId) continue;
    const sets = session.exercises.find((ex) => sameName(ex.name, name))?.sets.filter(isLoggedSet) ?? [];
    // Sessions are stored newest first, so on a tie the earlier one wins.
    if (sets.length > 0 && (!best || session.date > best.date)) best = { date: session.date, sets };
  }
  return best?.sets ?? [];
}

/** The steppers' values, with the weight in the unit chosen in Settings. */
export interface SetDraft {
  weight: string;
  reps: string;
  /** The stored kg the weight was seeded from, kept when the shown weight is left as seeded. */
  seededKg?: string;
}

// What the steppers start from: the last set logged this session, else the
// first set of last time.
export function seedDraft(exercise: ExerciseLog, history: Set[], unit: WeightUnit = "kg"): SetDraft {
  const last = exercise.sets.findLast(isLoggedSet) ?? history[0];
  return last ? { weight: weightText(last.weight, unit), reps: last.reps, seededKg: last.weight } : { weight: "", reps: "" };
}

// Writes the draft to the current set, appending it when the current set is virtual. The weight is stored in kg.
export function logDraft(exercise: ExerciseLog, draft: SetDraft, unit: WeightUnit = "kg"): { exercise: ExerciseLog; setId: string } {
  const index = currentSetIndex(exercise);
  const current = exercise.sets[index];
  const { seededKg } = draft;
  const untouched = seededKg !== undefined && draft.weight === weightText(seededKg, unit);
  const weight = untouched ? seededKg : storedWeight(draft.weight, unit);
  const logged: Set = { ...(current ?? { id: generateId() }), weight, reps: draft.reps };
  const sets = current
    ? exercise.sets.map((s, i) => (i === index ? logged : s))
    : [...exercise.sets, logged];
  return { exercise: { ...exercise, sets }, setId: logged.id };
}
