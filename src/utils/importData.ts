import { TrainingPlan, WorkoutSession } from "../types";

export interface MergeResult {
  plans: TrainingPlan[];
  sessions: WorkoutSession[];
  addedPlans: number;
  addedSessions: number;
}

/**
 * Adds imported data to what is on the device. A plan with a known name only gains the exercises it lacks;
 * a session with the same date, plan and notes counts as already there.
 */
export function mergeImport(
  plans: TrainingPlan[],
  sessions: WorkoutSession[],
  imported: { plans: TrainingPlan[]; sessions: WorkoutSession[] },
): MergeResult {
  const mergedPlans = [...plans];
  let addedPlans = 0;
  for (const imp of imported.plans) {
    const index = mergedPlans.findIndex((p) => p.name === imp.name);
    if (index === -1) {
      mergedPlans.push(imp);
      addedPlans++;
      continue;
    }
    const existing = mergedPlans[index];
    const missing = imp.exercises.filter((ex) => !existing.exercises.some((e) => e.name === ex.name));
    if (missing.length) mergedPlans[index] = { ...existing, exercises: [...existing.exercises, ...missing] };
  }

  const mergedSessions = [...sessions];
  let addedSessions = 0;
  for (const imp of imported.sessions) {
    const isDuplicate = mergedSessions.some(
      (s) => s.date === imp.date && s.planName === imp.planName && s.notes === imp.notes,
    );
    if (isDuplicate) continue;
    mergedSessions.push(imp);
    addedSessions++;
  }

  return { plans: mergedPlans, sessions: mergedSessions, addedPlans, addedSessions };
}
