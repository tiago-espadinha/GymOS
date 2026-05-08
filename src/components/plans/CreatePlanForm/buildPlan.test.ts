import { describe, expect, it } from "vitest";
import { buildPlan } from "./buildPlan";
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

  it("drops exercises without a name", () => {
    const result = buildPlan("Push day", "", [blank, run]);
    if (!("plan" in result)) throw new Error("expected a plan");
    expect(result.plan.exercises).toEqual([run]);
  });

  it("requires a plan name", () => {
    expect(buildPlan("  ", "", [run])).toEqual({ errors: { name: "Plan name is required" } });
  });

  it("requires at least one named exercise", () => {
    expect(buildPlan("Push day", "", [blank])).toEqual({
      errors: { exercises: "Add at least one exercise" },
    });
  });

  it("reports both errors together", () => {
    expect(buildPlan("", "", [blank])).toEqual({
      errors: { name: "Plan name is required", exercises: "Add at least one exercise" },
    });
  });
});
