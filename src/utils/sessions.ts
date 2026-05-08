import { WorkoutSession } from "../types";

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

// "Nov 16, 25 · 12 sets · 4200 kg"; volume is left out when nothing was lifted.
export function sessionSummary(date: string, stats: { sets: number; volume: number }): string {
  const sets = `${stats.sets} set${stats.sets === 1 ? "" : "s"}`;
  const parts = [date, sets];
  if (stats.volume > 0) parts.push(`${stats.volume.toFixed(0)} kg`);
  return parts.join(" · ");
}
