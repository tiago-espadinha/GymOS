import { generateId } from "../../../utils/id";
import { Exercise, TrainingPlan } from "../../../types";

export interface PlanErrors {
  name?: string;
  exercises?: string;
}

export type BuildPlanResult = { plan: TrainingPlan } | { errors: PlanErrors };

// Exercises left without a name are dropped, as the form has always done.
export function buildPlan(name: string, desc: string, exercises: Exercise[]): BuildPlanResult {
  const named = exercises.filter((e) => e.name.trim());
  const errors: PlanErrors = {};
  if (!name.trim()) errors.name = "Plan name is required";
  if (named.length === 0) errors.exercises = "Add at least one exercise";
  if (errors.name || errors.exercises) return { errors };

  return {
    plan: {
      id: generateId(),
      name: name.trim(),
      desc: desc.trim(),
      exercises: named.map((e) => ({ ...e, name: e.name.trim() })),
    },
  };
}
