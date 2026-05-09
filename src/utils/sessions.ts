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

// "30 sets · 5,022 kg · Felt strong": volume is left out when nothing was lifted,
// and multi-line notes are folded onto the row's single line.
export function sessionSummary(stats: { sets: number; volume: number }, notes = ""): string {
  const parts = [`${stats.sets} set${stats.sets === 1 ? "" : "s"}`];
  if (stats.volume > 0) parts.push(`${Math.round(stats.volume).toLocaleString("en-US")} kg`);
  const note = notes.replace(/\s+/g, " ").trim();
  if (note) parts.push(note);
  return parts.join(" · ");
}

// Sessions by date, newest first. Storage order is not date order: import appends and a
// backdated save is prepended. The sort is stable, so a same-day tie keeps save order.
export function newestFirst(sessions: WorkoutSession[]): WorkoutSession[] {
  return sessions.toSorted((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}
