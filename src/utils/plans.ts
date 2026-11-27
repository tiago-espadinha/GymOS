import { TrainingPlan, WorkoutSession } from "../types";
import { formatDayMonth } from "./date";
import { newestFirst } from "./sessions";

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

// The first exercise names of a plan and how many are left over ("+ 3 more").
export function planPreview(plan: TrainingPlan, count = 4): { names: string[]; more: number } {
  return {
    names: plan.exercises.slice(0, count).map((ex) => ex.name),
    more: Math.max(0, plan.exercises.length - count),
  };
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

// "7 exercises · last trained 4 May" on Log home, "7 exercises · last 4 May" in the
// plan picker, or "9 exercises · not trained yet".
export function planTrainedSummary(
  plan: TrainingPlan,
  sessions: WorkoutSession[],
  todayStr: string,
  lead = "last trained",
): string {
  const last = lastTrained(plan.id, sessions);
  return `${exerciseCount(plan)} · ${last ? `${lead} ${formatDayMonth(last, todayStr)}` : "not trained yet"}`;
}

// Log home starts on the plan of the newest session when it is still active, else the first active plan.
export function defaultPlan(active: TrainingPlan[], sessions: WorkoutSession[]): TrainingPlan | undefined {
  const newest = newestFirst(sessions)[0];
  return (newest && active.find((p) => p.id === newest.planId)) || active[0];
}

// The kicker over a plan's detail on wide Plans: "Plan · last trained 4 May" or "Plan · not trained yet".
export function planDetailKicker(plan: TrainingPlan, sessions: WorkoutSession[], todayStr: string): string {
  const last = lastTrained(plan.id, sessions);
  return `Plan · ${last ? `last trained ${formatDayMonth(last, todayStr)}` : "not trained yet"}`;
}

// The plan to show once `id` leaves the list: the one after it, else the one before, else none.
export function neighbourOf(plans: TrainingPlan[], id: string): TrainingPlan | undefined {
  const i = plans.findIndex((p) => p.id === id);
  if (i < 0) return undefined;
  return plans[i + 1] ?? plans[i - 1];
}

// The Plans screen title counts active plans: "17 Plans", "1 Plan"; the empty state already says there are none.
export function plansTitle(active: number): string {
  if (active === 0) return "Plans";
  return `${active} Plan${active === 1 ? "" : "s"}`;
}

// An edited plan replaces the stored one in place, so it keeps its position and archive state.
export function updatePlan(plans: TrainingPlan[], edited: TrainingPlan): TrainingPlan[] {
  return plans.map((p) => (p.id === edited.id ? { ...p, ...edited } : p));
}

interface Rename {
  from: string;
  to: string;
}

function renamesOf(before: TrainingPlan, after: TrainingPlan) {
  const exercises = new Map<string, Rename>();
  for (const ex of after.exercises) {
    const old = before.exercises.find((e) => e.id === ex.id);
    // A name cleared to be retyped is not a rename yet.
    if (old && ex.name && old.name !== ex.name) exercises.set(ex.id, { from: old.name, to: ex.name });
  }
  const plan = before.name !== after.name ? { from: before.name, to: after.name } : null;
  return { exercises, plan };
}

// Renaming a plan or its exercises renames them in that plan's past sessions too, so Log
// and Stats keep one name. Exercises match by id: an imported session without the plan's
// ids keeps the old name. Unchanged sessions come back as the same objects.
export function carryRenames(
  sessions: WorkoutSession[],
  before: TrainingPlan,
  after: TrainingPlan,
): { sessions: WorkoutSession[]; changed: number } {
  const renames = renamesOf(before, after);
  let changed = 0;
  const next = sessions.map((s) => {
    if (s.planId !== after.id) return s;
    const hit = renames.plan || s.exercises.some((ex) => renames.exercises.has(ex.id));
    if (!hit) return s;
    changed += 1;
    return {
      ...s,
      planName: renames.plan ? renames.plan.to : s.planName,
      exercises: s.exercises.map((ex) => {
        const r = renames.exercises.get(ex.id);
        return r ? { ...ex, name: r.to } : ex;
      }),
    };
  });
  return { sessions: next, changed };
}

// The line over Save changes when a rename reaches past sessions, or null when none does.
export function renameNote(before: TrainingPlan, after: TrainingPlan, changed: number): string | null {
  if (changed === 0) return null;
  const { exercises, plan } = renamesOf(before, after);
  const where = `${changed} past session${changed === 1 ? "" : "s"}`;
  const all = [...exercises.values()];
  if (all.length === 1 && !plan) return `${all[0].from} is now ${all[0].to} in ${where} and in Stats.`;
  if (all.length === 0 && plan) return `${plan.from} is now ${plan.to} in ${where}.`;
  return `${all.length + Number(!!plan)} renames carry into ${where}${all.length ? " and Stats" : ""}.`;
}
