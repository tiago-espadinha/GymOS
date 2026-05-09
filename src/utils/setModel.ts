import { ExerciseLog, Set, WorkoutSession } from "../types";
import { isLoggedSet } from "./activeSession";
import { generateId } from "./id";

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

export interface SetDraft {
  weight: string;
  reps: string;
}

const draftOf = (s: Set): SetDraft => ({ weight: s.weight, reps: s.reps });

// What the steppers start from: the last set logged this session, else the
// first set of last time.
export function seedDraft(exercise: ExerciseLog, history: Set[]): SetDraft {
  const last = exercise.sets.findLast(isLoggedSet) ?? history[0];
  return last ? draftOf(last) : { weight: "", reps: "" };
}

// Writes the draft to the current set, appending it when the current set is virtual.
export function logDraft(exercise: ExerciseLog, draft: SetDraft): { exercise: ExerciseLog; setId: string } {
  const index = currentSetIndex(exercise);
  const current = exercise.sets[index];
  const logged: Set = { ...(current ?? { id: generateId() }), weight: draft.weight, reps: draft.reps };
  const sets = current
    ? exercise.sets.map((s, i) => (i === index ? logged : s))
    : [...exercise.sets, logged];
  return { exercise: { ...exercise, sets }, setId: logged.id };
}

const emptySet = (): Set => ({ id: generateId(), weight: "", reps: "" });

// Adds a row below the last one in the table. When the current set is virtual
// it becomes a real row too, so the new one shows up after it.
export function addPendingSet(exercise: ExerciseLog): ExerciseLog {
  const virtual = currentSetIndex(exercise) === exercise.sets.length;
  return {
    ...exercise,
    sets: [...exercise.sets, ...(virtual ? [emptySet(), emptySet()] : [emptySet()])],
  };
}
