import { TrainingPlan, WorkoutSession } from "../types";
import { formatDayMonth } from "./date";

// Distinct muscle groups of a plan, in the order they first appear.
export function muscleGroupsOf(plan: TrainingPlan): string[] {
  const groups: string[] = [];
  for (const ex of plan.exercises) {
    if (ex.muscleGroup && !groups.includes(ex.muscleGroup)) groups.push(ex.muscleGroup);
  }
  return groups;
}

export function exerciseCount(plan: TrainingPlan): string {
  const n = plan.exercises.length;
  return `${n} exercise${n === 1 ? "" : "s"}`;
}

// "3 exercises · Chest, Back"
export function planSummary(plan: TrainingPlan): string {
  const groups = muscleGroupsOf(plan);
  return groups.length ? `${exerciseCount(plan)} · ${groups.join(", ")}` : exerciseCount(plan);
}

// Archiving and restoring keep the plan in place, so Undo returns it to the same position.
export function archivePlan(plans: TrainingPlan[], id: string, date: string): TrainingPlan[] {
  return plans.map((p) => (p.id === id ? { ...p, isArchived: true, archivedAt: date } : p));
}

export function restorePlan(plans: TrainingPlan[], id: string): TrainingPlan[] {
  return plans.map((p) => {
    if (p.id !== id) return p;
    const next: TrainingPlan = { ...p, isArchived: false };
    delete next.archivedAt;
    return next;
  });
}

export function deletePlan(plans: TrainingPlan[], id: string): TrainingPlan[] {
  return plans.filter((p) => p.id !== id);
}

// The most recent session date logged with this plan, or null.
export function lastTrained(planId: string, sessions: WorkoutSession[]): string | null {
  let latest: string | null = null;
  for (const s of sessions) {
    if (s.planId === planId && (!latest || s.date > latest)) latest = s.date;
  }
  return latest;
}

// "Archived today · 7 exercises", "Archived 12 Oct · 6 exercises", or "Archived · 5 exercises" with no date.
export function archivedSummary(plan: TrainingPlan, todayStr: string): string {
  const count = exerciseCount(plan);
  if (!plan.archivedAt) return `Archived · ${count}`;
  if (plan.archivedAt === todayStr) return `Archived today · ${count}`;
  return `Archived ${formatDayMonth(plan.archivedAt, todayStr)} · ${count}`;
}

// "7 exercises · last trained 2 May", or just the count when it was never trained.
export function planActionsSummary(plan: TrainingPlan, sessions: WorkoutSession[], todayStr: string): string {
  const last = lastTrained(plan.id, sessions);
  return last ? `${exerciseCount(plan)} · last trained ${formatDayMonth(last, todayStr)}` : exerciseCount(plan);
}

// The kicker over the Plans title: "17 plans", "16 plans · 3 archived", "No plans".
export function plansCountLabel(active: number, archived: number): string {
  const lead = active === 0 ? "No plans" : `${active} plan${active === 1 ? "" : "s"}`;
  return archived ? `${lead} · ${archived} archived` : lead;
}
