import { ExerciseLog, Set, TrainingPlan, WorkoutSession } from "../types";
import { generateId } from "./id";

export const ACTIVE_SESSION_KEY = "gym:activeSession";

// A session that has been started but not saved yet. Kept apart from
// `gym:sessions` so unfinished work never reaches Progress or the CSV export.
export interface ActiveSession {
  planId: string;
  planName: string;
  date: string;
  notes: string;
  exercises: ExerciseLog[];
  editingId?: string; // set when editing an already saved session
}

const emptySet = (): Set => ({ id: generateId(), weight: "", reps: "" });

export function fromPlan(plan: TrainingPlan, date: string): ActiveSession {
  return {
    planId: plan.id,
    planName: plan.name,
    date,
    notes: "",
    exercises: plan.exercises.map((ex) => ({ ...ex, sets: [emptySet()] })),
  };
}

export function fromSaved(saved: WorkoutSession): ActiveSession {
  return {
    planId: saved.planId || "",
    planName: saved.planName,
    date: saved.date,
    notes: saved.notes || "",
    editingId: saved.id,
    exercises: saved.exercises.map((ex) => ({
      ...ex,
      sets: ex.sets.map((s) => ({ ...s, id: s.id || generateId() })),
    })),
  };
}

export function isLoggedSet(s: Set): boolean {
  return (
    parseFloat(s.weight) > 0 ||
    parseInt(s.reps) > 0 ||
    Number(s.duration) > 0 ||
    parseFloat(s.distance || "") > 0
  );
}

export function hasLoggedSets(session: ActiveSession): boolean {
  return session.exercises.some((ex) => ex.sets.some(isLoggedSet));
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

// Storage is untrusted: anything that is not the expected shape means "no
// session", so a bad value can never trap the user outside the tab bar.
export function parseActiveSession(raw: unknown): ActiveSession | null {
  if (!isObject(raw)) return null;
  const { planId, planName, date, notes, exercises, editingId } = raw;
  if (
    typeof planId !== "string" ||
    typeof planName !== "string" ||
    typeof date !== "string" ||
    typeof notes !== "string" ||
    !Array.isArray(exercises) ||
    (editingId !== undefined && typeof editingId !== "string")
  ) {
    return null;
  }
  const valid = exercises.every(
    (ex) =>
      isObject(ex) &&
      typeof ex.id === "string" &&
      typeof ex.name === "string" &&
      Array.isArray(ex.sets) &&
      ex.sets.every((s) => isObject(s) && typeof s.id === "string"),
  );
  if (!valid) return null;
  return { planId, planName, date, notes, exercises, editingId } as ActiveSession;
}

export function loadActiveSession(): ActiveSession | null {
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
    return raw ? parseActiveSession(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveActiveSession(session: ActiveSession | null): void {
  try {
    if (session) localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch {
    // Storage full or blocked: the session still works in memory.
  }
}
