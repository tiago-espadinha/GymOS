import { describe, expect, it } from "vitest";
import type { ExerciseLog } from "../../../types";
import { copySet, setColumns } from "./columns";

const units = { weight: "kg", distance: "km" } as const;
const exercise = (extra: Partial<ExerciseLog>): ExerciseLog => ({ id: "e", name: "x", muscleGroup: "Core", sets: [], ...extra });
const keys = (extra: Partial<ExerciseLog>) => setColumns(exercise(extra), units).map((c) => c.key);

describe("saved set columns", () => {
  it("follows what the exercise tracks", () => {
    expect(keys({})).toEqual(["weight", "reps"]);
    expect(keys({ category: "calisthenics", trackingType: "time" })).toEqual(["duration"]);
    expect(keys({ category: "cardio", trackingType: "time", trackDistance: true })).toEqual(["duration", "distance"]);
  });

  it("stores a distance in the exercise's own unit", () => {
    const [, distance] = setColumns(
      exercise({ category: "cardio", trackingType: "time", trackDistance: true, distanceUnit: "km" }),
      { weight: "kg", distance: "mi" },
    );
    expect(Number(distance.format.store("1"))).toBeCloseTo(1.609344, 6);
  });

  it("copies the last set's values without its id or rest", () => {
    const last = { id: "a", weight: "", reps: "", duration: "45", restTaken: "60", completed: true };
    expect(copySet(last, "b")).toEqual({ id: "b", weight: "", reps: "", duration: "45" });
    expect(copySet(undefined, "c")).toEqual({ id: "c", weight: "", reps: "" });
  });
});
