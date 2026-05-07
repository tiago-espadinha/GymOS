import { beforeEach, describe, expect, it, vi } from "vitest";
import { TrainingPlan, WorkoutSession } from "../types";
import {
  ACTIVE_SESSION_KEY,
  fromPlan,
  fromSaved,
  hasLoggedSets,
  loadActiveSession,
  parseActiveSession,
  saveActiveSession,
} from "./activeSession";

const plan: TrainingPlan = {
  id: "p1",
  name: "Push",
  desc: "",
  exercises: [
    { id: "e1", name: "Bench", muscleGroup: "Chest" },
    { id: "e2", name: "Dips", muscleGroup: "Triceps" },
  ],
};

function stubLocalStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  return store;
}

describe("active session", () => {
  let store: Map<string, string>;
  beforeEach(() => {
    store = stubLocalStorage();
  });

  it("starts from a plan with one empty set per exercise", () => {
    const s = fromPlan(plan, "2026-11-17");
    expect(s).toMatchObject({ planId: "p1", planName: "Push", date: "2026-11-17", notes: "" });
    expect(s.exercises.map((e) => [e.name, e.sets.length])).toEqual([["Bench", 1], ["Dips", 1]]);
    expect(hasLoggedSets(s)).toBe(false);
  });

  it("starts from a saved session and remembers which one it edits", () => {
    const saved: WorkoutSession = {
      id: "s9",
      planId: "p1",
      planName: "Push",
      date: "2026-11-10",
      notes: "heavy",
      exercises: [{ ...plan.exercises[0], sets: [{ id: "", weight: "80", reps: "5" }] }],
    };
    const s = fromSaved(saved);
    expect(s.editingId).toBe("s9");
    expect(s.notes).toBe("heavy");
    expect(s.exercises[0].sets[0].id).not.toBe("");
    expect(hasLoggedSets(s)).toBe(true);
  });

  it("restores a saved session after a reload", () => {
    const s = fromPlan(plan, "2026-11-17");
    s.exercises[0].sets[0] = { id: "x", weight: "60", reps: "8" };
    saveActiveSession(s);
    expect(loadActiveSession()).toEqual(s);
  });

  it("clears storage when the session ends", () => {
    saveActiveSession(fromPlan(plan, "2026-11-17"));
    saveActiveSession(null);
    expect(store.has(ACTIVE_SESSION_KEY)).toBe(false);
    expect(loadActiveSession()).toBeNull();
  });

  it.each([
    ["not JSON", "{oops"],
    ["a string", JSON.stringify("hi")],
    ["missing fields", JSON.stringify({ planId: "p1" })],
    ["bad exercises", JSON.stringify({ planId: "p", planName: "n", date: "d", notes: "", exercises: [{ id: 1 }] })],
    ["bad sets", JSON.stringify({ planId: "p", planName: "n", date: "d", notes: "", exercises: [{ id: "e", name: "n", sets: [null] }] })],
  ])("starts in browse mode when storage holds %s", (_label, raw) => {
    store.set(ACTIVE_SESSION_KEY, raw);
    expect(loadActiveSession()).toBeNull();
  });

  it("rejects non-objects", () => {
    expect(parseActiveSession(null)).toBeNull();
    expect(parseActiveSession([])).toBeNull();
  });
});
