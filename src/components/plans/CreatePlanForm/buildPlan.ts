import { generateId } from "../../../utils/id";
import { Exercise, TrainingPlan } from "../../../types";

export const NAME_ERROR = "Give the plan a name";
export const EXERCISE_NAME_ERROR = "Name this exercise or remove it";
export const NO_EXERCISES_ERROR = "Add at least one exercise";

export interface PlanErrors {
  name?: string;
  /** Set only when the plan has no exercises at all. */
  exercises?: string;
  /** Ids of exercises left without a name: flagged, never silently dropped. */
  unnamed: string[];
}

export function validatePlan(name: string, exercises: Exercise[]): PlanErrors {
  return {
    name: name.trim() ? undefined : NAME_ERROR,
    exercises: exercises.length ? undefined : NO_EXERCISES_ERROR,
    unnamed: exercises.filter((e) => !e.name.trim()).map((e) => e.id),
  };
}

/** How many separate things the user has to fix, for the summary over Save. */
export function errorCount(errors: PlanErrors): number {
  return Number(!!errors.name) + Number(!!errors.exercises) + errors.unnamed.length;
}

export type BuildPlanResult = { plan: TrainingPlan } | { errors: PlanErrors };

/** What the form would store: trimmed text, every exercise field kept. */
export const draftOf = (id: string, name: string, desc: string, exercises: Exercise[]): TrainingPlan => ({
  id,
  name: name.trim(),
  desc: desc.trim(),
  exercises: exercises.map((e) => ({ ...e, name: e.name.trim() })),
});

/** `id` is kept when editing; a new plan gets a fresh one. */
export function buildPlan(name: string, desc: string, exercises: Exercise[], id = generateId()): BuildPlanResult {
  const errors = validatePlan(name, exercises);
  if (errorCount(errors) > 0) return { errors };

  return { plan: draftOf(id, name, desc, exercises) };
}
