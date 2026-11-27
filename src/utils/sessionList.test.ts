import { describe, expect, it } from "vitest";
import { ExerciseLog, Set } from "../types";
import { NO_VALUES, currentExerciseId, currentSetNumber, exerciseProgress, exerciseSummary, lastTimeValue, lastValues, rowSubtitle, sessionTotals } from "./sessionList";

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
    expect(lastValues(ex, { weight: "kg", distance: "mi" })).toBe("25:00 · 5 mi");
    expect(lastValues(ex)).toBe("25:00 · 8.05 km");
  });

  it("shows stored kg in lb", () => {
    const ex = exercise([set({ weight: "100", reps: "5" })]);
    expect(lastValues(ex, { weight: "lbs", distance: "km" })).toBe("220.5 lb × 5");
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

describe("currentSetNumber", () => {
  it("is the first set with nothing logged", () => {
    expect(currentSetNumber(exercise([set({ weight: "60", reps: "8" }), set(), set()]))).toEqual({ number: 2, total: 3 });
  });

  it("is a virtual next set once every set is logged", () => {
    expect(currentSetNumber(exercise([set({ reps: "8" }), set({ reps: "8" })]))).toEqual({ number: 3, total: 3 });
  });

  it("counts a timed set with a held duration as logged", () => {
    const plank = exercise([set({ duration: "30", completed: true }), set()], { trackingType: "time" });
    expect(currentSetNumber(plank)).toEqual({ number: 2, total: 2 });
  });
});

describe("rowSubtitle", () => {
  const history = [set({ weight: "8", reps: "12" }), set({ weight: "8", reps: "10" })];

  it("shows the first set of last time before anything is logged", () => {
    expect(rowSubtitle(exercise([set()]), history)).toBe("Last 8 kg × 12");
  });

  it("says so when there is no history", () => {
    expect(rowSubtitle(exercise([set()]), [])).toBe("Not logged recently");
  });

  it("shows the last set and progress while added sets are pending", () => {
    const ex = exercise([set({ weight: "35", reps: "12" }), set(), set()]);
    expect(rowSubtitle(ex, history)).toBe("35 kg × 12 · 1 of 3 done");
  });

  it("reads done once no set is pending", () => {
    expect(rowSubtitle(exercise([set({ weight: "40", reps: "12" })]), [])).toBe("40 kg × 12 · done");
  });
});

describe("lastTimeValue", () => {
  const history = [set({ weight: "60", reps: "10" }), set({ weight: "57.5", reps: "8" })];

  it("pairs each set with last time's set at the same position", () => {
    const ex = exercise([]);
    expect(lastTimeValue(ex, history, 0)).toBe("60 kg × 10");
    expect(lastTimeValue(ex, history, 1)).toBe("57.5 kg × 8");
  });

  it("shows a dash for sets beyond last time's", () => {
    expect(lastTimeValue(exercise([]), history, 2)).toBe(NO_VALUES);
  });

  it("is a dash without history", () => {
    expect(lastTimeValue(exercise([]), [], 0)).toBe(NO_VALUES);
  });

  it("reads the stored kg in lb", () => {
    const lb = [set({ weight: "61.23496995", reps: "12" })];
    expect(lastTimeValue(exercise([]), lb, 0, { weight: "lbs", distance: "km" })).toBe("135 lb × 12");
  });

  it("formats a timed set with its distance in the chosen unit", () => {
    const run = exercise([], { name: "Running", category: "cardio", trackingType: "time", trackDistance: true });
    const timed = [set({ duration: "90", distance: "2" })];
    expect(lastTimeValue(run, timed, 0, { weight: "kg", distance: "mi" })).toMatch(/^01:30 · 1\.2\d* mi$/);
  });
});
