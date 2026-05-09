import { describe, expect, it } from "vitest";
import { ExerciseLog, Set, WorkoutSession } from "../types";
import {
  addPendingSet,
  allExercisesDone,
  currentSetIndex,
  lastTimeSets,
  logDraft,
  seedDraft,
  virtualSetId,
} from "./setModel";

let n = 0;
const set = (over: Partial<Set> = {}): Set => ({ id: `s${n++}`, weight: "", reps: "", ...over });
const done = (weight: string, reps: string) => set({ weight, reps });

const exercise = (sets: Set[], over: Partial<ExerciseLog> = {}): ExerciseLog => ({
  id: "e1",
  name: "Machine Row",
  muscleGroup: "Back",
  sets,
  ...over,
});

const saved = (id: string, date: string, exercises: ExerciseLog[]): WorkoutSession => ({
  id,
  planId: "p1",
  planName: "Back",
  date,
  notes: "",
  exercises,
});

describe("currentSetIndex", () => {
  it("is the first set with nothing logged, not the last", () => {
    expect(currentSetIndex(exercise([done("35", "12"), set(), done("35", "10")]))).toBe(1);
  });

  it("is virtual, one past the end, once every set is logged", () => {
    expect(currentSetIndex(exercise([done("35", "12")]))).toBe(1);
    expect(currentSetIndex(exercise([]))).toBe(0);
  });
});

describe("virtualSetId", () => {
  it("is stable for the exercise, whatever its sets", () => {
    expect(virtualSetId(exercise([]))).toBe("e1-next");
    expect(virtualSetId(exercise([done("35", "12")]))).toBe("e1-next");
  });
});

describe("allExercisesDone", () => {
  it("needs a logged set on every exercise", () => {
    const a = exercise([done("35", "12")], { id: "a" });
    const b = exercise([set()], { id: "b" });
    expect(allExercisesDone([a, b])).toBe(false);
    expect(allExercisesDone([a, { ...b, sets: [done("8", "12")] }])).toBe(true);
  });

  it("is false for an empty session", () => {
    expect(allExercisesDone([])).toBe(false);
  });
});

describe("lastTimeSets", () => {
  const older = saved("old", "2026-11-01", [exercise([done("30", "12")])]);
  const newer = saved("new", "2026-11-08", [exercise([done("35", "12"), done("35", "10")], { name: "machine row " })]);
  const other = saved("x", "2026-11-10", [exercise([done("50", "5")], { name: "Squat" })]);

  it("takes the most recent saved session with that exercise name, ignoring case and spaces", () => {
    expect(lastTimeSets([other, older, newer], "Machine Row").map((s) => s.weight)).toEqual(["35", "35"]);
  });

  it("leaves out the session being edited", () => {
    expect(lastTimeSets([newer, older], "Machine Row", "new").map((s) => s.weight)).toEqual(["30"]);
  });

  it("is empty when no session has it", () => {
    expect(lastTimeSets([other], "Machine Row")).toEqual([]);
  });
});

describe("seedDraft", () => {
  const history = [done("35", "12"), done("37.5", "10")];

  it("starts from the last set logged this session", () => {
    expect(seedDraft(exercise([done("40", "8")]), history)).toEqual({ weight: "40", reps: "8" });
  });

  it("falls back to the first set of last time", () => {
    expect(seedDraft(exercise([set()]), history)).toEqual({ weight: "35", reps: "12" });
  });

  it("is empty with nothing to go on", () => {
    expect(seedDraft(exercise([set()]), [])).toEqual({ weight: "", reps: "" });
  });
});

describe("logDraft", () => {
  it("writes the draft into the current pending set", () => {
    const pending = set();
    const { exercise: ex, setId } = logDraft(exercise([done("35", "12"), pending]), { weight: "35", reps: "10" });
    expect(setId).toBe(pending.id);
    expect(ex.sets.map((s) => s.reps)).toEqual(["12", "10"]);
  });

  it("appends the virtual next set and adds no empty set after it", () => {
    const { exercise: ex, setId } = logDraft(exercise([done("35", "12")]), { weight: "35", reps: "12" });
    expect(ex.sets).toHaveLength(2);
    expect(ex.sets[1].id).toBe(setId);
    expect(currentSetIndex(ex)).toBe(2);
  });
});

describe("addPendingSet", () => {
  it("appends one empty set after a pending one", () => {
    expect(addPendingSet(exercise([done("35", "12"), set()])).sets).toHaveLength(3);
  });

  it("makes the virtual current set real so the added row follows it", () => {
    const ex = addPendingSet(exercise([done("35", "12")]));
    expect(ex.sets).toHaveLength(3);
    expect(currentSetIndex(ex)).toBe(1);
  });
});
