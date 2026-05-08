import { TrainingPlan } from "../types";

// Distinct muscle groups of a plan, in the order they first appear.
export function muscleGroupsOf(plan: TrainingPlan): string[] {
  const groups: string[] = [];
  for (const ex of plan.exercises) {
    if (ex.muscleGroup && !groups.includes(ex.muscleGroup)) groups.push(ex.muscleGroup);
  }
  return groups;
}

// "3 exercises · Chest, Back"
export function planSummary(plan: TrainingPlan): string {
  const n = plan.exercises.length;
  const count = `${n} exercise${n === 1 ? "" : "s"}`;
  const groups = muscleGroupsOf(plan);
  return groups.length ? `${count} · ${groups.join(", ")}` : count;
}
