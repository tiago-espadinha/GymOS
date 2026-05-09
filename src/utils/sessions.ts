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

// The parts of a session row: "30 sets", "5,022 kg" ("" when nothing was lifted)
// and the notes folded onto one line.
export function sessionCells(stats: { sets: number; volume: number }, notes = ""): { sets: string; volume: string; notes: string } {
  return {
    sets: `${stats.sets} set${stats.sets === 1 ? "" : "s"}`,
    volume: stats.volume > 0 ? `${Math.round(stats.volume).toLocaleString("en-US")} kg` : "",
    notes: notes.replace(/\s+/g, " ").trim(),
  };
}

// "30 sets · 5,022 kg · Felt strong", skipping the empty parts.
export function sessionSummary(stats: { sets: number; volume: number }, notes = ""): string {
  const { sets, volume, notes: note } = sessionCells(stats, notes);
  return [sets, volume, note].filter(Boolean).join(" · ");
}

// Sessions by date, newest first. Storage order is not date order: import appends and a
// backdated save is prepended. The sort is stable, so a same-day tie keeps save order.
export function newestFirst(sessions: WorkoutSession[]): WorkoutSession[] {
  return sessions.toSorted((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}
