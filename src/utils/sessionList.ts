import { formatClock } from "../hooks/useTimer";
import { ExerciseLog, Set } from "../types";
import { isLoggedSet } from "./activeSession";
import { getExerciseMeta } from "./metrics";
import { currentSetIndex } from "./setModel";
import { DEFAULT_UNIT_PREFS, type UnitPreferences } from "./unitPrefs";
import { distanceText, weightLabel, weightText } from "./units";

export const NO_VALUES = "—";

export function exerciseProgress(exercise: ExerciseLog): { done: number; total: number } {
  return { done: exercise.sets.filter(isLoggedSet).length, total: exercise.sets.length };
}

// The first exercise with nothing logged yet; null once every exercise has a set.
export function currentExerciseId(exercises: ExerciseLog[]): string | null {
  return exercises.find((ex) => !ex.sets.some(isLoggedSet))?.id ?? null;
}

// The set being entered, counted from 1; the virtual next set counts in the total.
export function currentSetNumber(exercise: ExerciseLog): { number: number; total: number } {
  const number = currentSetIndex(exercise) + 1;
  return { number, total: Math.max(exercise.sets.length, number) };
}

// Weights and distances read in the chosen units; the sets keep their stored values.
export function formatSet(set: Set, exercise: ExerciseLog, units: UnitPreferences = DEFAULT_UNIT_PREFS): string {
  const meta = getExerciseMeta(exercise);
  if (meta.trackingType === "time") {
    const parts = [];
    if (Number(set.duration) > 0) parts.push(formatClock(Number(set.duration) * 1000));
    if (parseFloat(set.distance || "") > 0) parts.push(`${distanceText(set.distance!, meta.distanceUnit, units.distance)} ${units.distance}`);
    return parts.join(" · ");
  }
  const reps = parseInt(set.reps) > 0 ? set.reps : "";
  const weight = `${weightText(set.weight, units.weight)} ${weightLabel(units.weight)}`;
  if (parseFloat(set.weight) > 0) return reps ? `${weight} × ${reps}` : weight;
  return reps ? `${reps} reps` : "";
}

// The last logged set of this session, e.g. "60 kg × 8", or a dash when there is none.
export function lastValues(exercise: ExerciseLog, units: UnitPreferences = DEFAULT_UNIT_PREFS): string {
  const last = exercise.sets.findLast(isLoggedSet);
  return (last && formatSet(last, exercise, units)) || NO_VALUES;
}

// Exercises with a logged set, logged sets, and weight x reps over those sets.
export function sessionTotals(exercises: ExerciseLog[]): { exercises: number; sets: number; volume: number } {
  let sets = 0;
  let volume = 0;
  let worked = 0;
  for (const exercise of exercises) {
    const logged = exercise.sets.filter(isLoggedSet);
    if (logged.length > 0) worked += 1;
    sets += logged.length;
    for (const set of logged) volume += (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0);
  }
  return { exercises: worked, sets, volume };
}

// "3 × 40 kg × 12" when every logged set matches, otherwise just "3 sets".
export function exerciseSummary(exercise: ExerciseLog, units: UnitPreferences = DEFAULT_UNIT_PREFS): string {
  const logged = exercise.sets.filter(isLoggedSet);
  if (logged.length === 0) return NO_VALUES;
  const values = logged.map((s) => formatSet(s, exercise, units));
  if (values.every((v) => v === values[0]) && values[0]) return `${logged.length} × ${values[0]}`;
  return `${logged.length} set${logged.length === 1 ? "" : "s"}`;
}

// A row's second line: this session's last set and progress once one is logged,
// otherwise the first set of last time.
export function rowSubtitle(exercise: ExerciseLog, history: Set[], units: UnitPreferences = DEFAULT_UNIT_PREFS): string {
  const { done, total } = exerciseProgress(exercise);
  if (done > 0) return `${lastValues(exercise, units)} · ${done < total ? `${done} of ${total} done` : "done"}`;
  return history.length > 0 ? `Last ${formatSet(history[0], exercise, units)}` : "Not logged recently";
}

// The sets table's Last cell: last time's set at the same position, in the chosen units;
// a dash where last time had fewer sets.
export function lastTimeValue(exercise: ExerciseLog, history: Set[], index: number, units: UnitPreferences = DEFAULT_UNIT_PREFS): string {
  const then = history[index];
  return (then && formatSet(then, exercise, units)) || NO_VALUES;
}

/** The id of the last exercise screen's Finish card, so focus can return to it. */
export const exerciseFinishId = (exerciseId: string) => `exerciseFinish-${exerciseId}`;
