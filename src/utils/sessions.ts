import { WorkoutSession } from "../types";
import type { WeightUnit } from "./unitPrefs";
import { kgTo, weightLabel } from "./units";

// Set count and total volume (weight x reps) of a saved session.
export function sessionStats(session: WorkoutSession): { sets: number; volume: number } {
  let sets = 0;
  let volume = 0;
  for (const exercise of session.exercises) {
    for (const set of exercise.sets) {
      sets += 1;
      volume += (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0);
    }
  }
  return { sets, volume };
}

// The parts of a session row: "30 sets", "5,022 kg" ("" when nothing was lifted) in the chosen
// unit, and the notes folded onto one line. The volume comes in kg.
export function sessionCells(
  stats: { sets: number; volume: number },
  notes = "",
  unit: WeightUnit = "kg",
): { sets: string; volume: string; notes: string } {
  return {
    sets: `${stats.sets} set${stats.sets === 1 ? "" : "s"}`,
    volume: stats.volume > 0 ? `${Math.round(kgTo(stats.volume, unit)).toLocaleString("en-US")} ${weightLabel(unit)}` : "",
    notes: notes.replace(/\s+/g, " ").trim(),
  };
}

// "30 sets · 5,022 kg · Felt strong", skipping the empty parts.
export function sessionSummary(stats: { sets: number; volume: number }, notes = "", unit: WeightUnit = "kg"): string {
  const { sets, volume, notes: note } = sessionCells(stats, notes, unit);
  return [sets, volume, note].filter(Boolean).join(" · ");
}

// Sessions by date, newest first. Storage order is not date order: import appends and a
// backdated save is prepended. The sort is stable, so a same-day tie keeps save order.
export function newestFirst(sessions: WorkoutSession[]): WorkoutSession[] {
  return sessions.toSorted((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

// Imported sessions may have no plan id, so their saved plan name groups them instead.
export function sessionPlanKey(session: WorkoutSession): string {
  return session.planId || `name:${session.planName}`;
}

// The plans that have saved sessions, by their latest session, named as last saved.
// Archived and deleted plans count: the filter lists history, not the current plans.
export function sessionPlans(sessions: WorkoutSession[]): { key: string; name: string }[] {
  const plans = new Map<string, string>();
  for (const session of newestFirst(sessions)) {
    const key = sessionPlanKey(session);
    if (!plans.has(key)) plans.set(key, session.planName);
  }
  return [...plans].map(([key, name]) => ({ key, name }));
}
