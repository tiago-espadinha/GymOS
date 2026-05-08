import { describe, expect, it } from "vitest";
import { ExerciseLog, Set } from "../types";
import { NO_VALUES, currentExerciseId, exerciseProgress, exerciseSummary, lastValues, sessionTotals } from "./sessionList";

const set = (over: Partial<Set> = {}): Set => ({ id: Math.random().toString(), weight: "", reps: "", ...over });

const exercise = (sets: Set[], over: Partial<ExerciseLog> = {}): ExerciseLog => ({
  id: "e1",
  name: "Bench",
  muscleGroup: "Chest",
  sets,
  ...over,
});

describe("exerciseProgress", () => {
  it("counts logged sets against all planned sets", () => {
    const ex = exercise([set({ weight: "60", reps: "8" }), set({ reps: "5" }), set()]);
    expect(exerciseProgress(ex)).toEqual({ done: 2, total: 3 });
  });
});

describe("currentExerciseId", () => {
  const done = exercise([set({ weight: "60", reps: "8" })], { id: "a" });
  const open = exercise([set()], { id: "b" });
  const later = exercise([set()], { id: "c" });

  it("is the first exercise with nothing logged", () => {
    expect(currentExerciseId([done, open, later])).toBe("b");
  });

  it("is null once every exercise has a logged set", () => {
    expect(currentExerciseId([done])).toBeNull();
  });
});

describe("lastValues", () => {
  it("shows weight and reps of the last logged set, skipping empty ones", () => {
    const ex = exercise([set({ weight: "60", reps: "10" }), set({ weight: "62.5", reps: "8" }), set()]);
    expect(lastValues(ex)).toBe("62.5 kg × 8");
  });

  it("shows reps alone for bodyweight work", () => {
    const ex = exercise([set({ reps: "12" })], { category: "calisthenics", trackWeight: false });
    expect(lastValues(ex)).toBe("12 reps");
  });

  it("shows a duration as minutes and seconds", () => {
    const ex = exercise([set({ duration: "75" })], { category: "calisthenics", trackingType: "time" });
    expect(lastValues(ex)).toBe("01:15");
  });

  it("adds the distance and its unit for cardio", () => {
    const ex = exercise([set({ duration: "1500", distance: "5" })], { category: "cardio", distanceUnit: "mi" });
    expect(lastValues(ex)).toBe("25:00 · 5 mi");
  });

  it("is a dash when nothing is logged", () => {
    expect(lastValues(exercise([set()]))).toBe(NO_VALUES);
  });
});

describe("sessionTotals", () => {
  it("counts only logged sets and exercises, and sums weight times reps", () => {
    const totals = sessionTotals([
      exercise([set({ weight: "40", reps: "12" }), set({ weight: "40", reps: "10" }), set()], { id: "a" }),
      exercise([set({ duration: "30" })], { id: "b" }),
      exercise([set()], { id: "c" }),
    ]);
    expect(totals).toEqual({ exercises: 2, sets: 3, volume: 880 });
  });

  it("is all zeros when nothing is logged", () => {
    expect(sessionTotals([exercise([set()])])).toEqual({ exercises: 0, sets: 0, volume: 0 });
  });
});

describe("exerciseSummary", () => {
  it("shows count × values when every logged set matches", () => {
    const ex = exercise([set({ weight: "40", reps: "12" }), set({ weight: "40", reps: "12" }), set()]);
    expect(exerciseSummary(ex)).toBe("2 × 40 kg × 12");
  });

  it("falls back to the set count when sets differ", () => {
    const ex = exercise([set({ weight: "40", reps: "12" }), set({ weight: "42.5", reps: "10" })]);
    expect(exerciseSummary(ex)).toBe("2 sets");
  });

  it("shows a dash when nothing is logged", () => {
    expect(exerciseSummary(exercise([set()]))).toBe(NO_VALUES);
  });
});
