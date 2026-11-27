import { describe, expect, it } from "vitest";
import { buildPlan, errorCount, validatePlan, NAME_ERROR, NO_EXERCISES_ERROR } from "./buildPlan";
import { Exercise, TrainingPlan } from "../../../types";

const bench: Exercise = {
  id: "e1",
  name: "  Bench press ",
  muscleGroup: "Chest",
  category: "strength",
  trackingType: "reps",
  trackWeight: true,
  trackDistance: false,
};
const run: Exercise = {
  id: "e2",
  name: "Run",
  muscleGroup: "Cardio",
  category: "cardio",
  trackingType: "time",
  trackDistance: true,
  distanceUnit: "mi",
};
const blank: Exercise = { id: "e3", name: "   ", muscleGroup: "Chest" };

describe("buildPlan", () => {
  it("builds a TrainingPlan with trimmed text and every exercise field kept", () => {
    const result = buildPlan("  Push day ", " Chest and shoulders ", [bench, run]);
    if (!("plan" in result)) throw new Error("expected a plan");
    const { id, ...rest } = result.plan;
    expect(id).toBeTruthy();
    expect(rest).toEqual<Omit<TrainingPlan, "id">>({
      name: "Push day",
      desc: "Chest and shoulders",
      exercises: [{ ...bench, name: "Bench press" }, run],
    });
  });

  it("flags exercises without a name instead of dropping them", () => {
    expect(buildPlan("Push day", "", [blank, run])).toEqual({
      errors: { name: undefined, exercises: undefined, unnamed: ["e3"] },
    });
  });

  it("requires a plan name", () => {
    expect(buildPlan("  ", "", [run])).toEqual({
      errors: { name: NAME_ERROR, exercises: undefined, unnamed: [] },
    });
  });

  it("requires at least one exercise", () => {
    expect(buildPlan("Push day", "", [])).toEqual({
      errors: { name: undefined, exercises: NO_EXERCISES_ERROR, unnamed: [] },
    });
  });

  it("counts every thing to fix for the summary", () => {
    expect(errorCount(validatePlan("", [blank, { ...blank, id: "e4" }]))).toBe(3);
    expect(errorCount(validatePlan("", []))).toBe(2);
    expect(errorCount(validatePlan("Push day", [run]))).toBe(0);
  });

  it("keeps the id it is given, so an edited plan replaces the stored one", () => {
    const result = buildPlan("Push day", "", [bench], "p1");
    if (!("plan" in result)) throw new Error("expected a plan");
    expect(result.plan.id).toBe("p1");
  });
});
