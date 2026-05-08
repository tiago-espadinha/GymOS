import { describe, expect, it } from "vitest";
import { muscleGroupsOf, planSummary } from "./plans";
import { TrainingPlan } from "../types";

const plan = (groups: string[]): TrainingPlan => ({
  id: "p",
  name: "Plan",
  desc: "",
  exercises: groups.map((muscleGroup, i) => ({ id: `e${i}`, name: `Ex ${i}`, muscleGroup })),
});

describe("plan summary", () => {
  it("lists each distinct muscle group once, in first-appearance order", () => {
    expect(muscleGroupsOf(plan(["Chest", "Back", "Chest"]))).toEqual(["Chest", "Back"]);
    expect(planSummary(plan(["Chest", "Back", "Chest"]))).toBe("3 exercises · Chest, Back");
  });

  it("uses the singular for one exercise", () => {
    expect(planSummary(plan(["Legs"]))).toBe("1 exercise · Legs");
  });

  it("shows only the count when no exercise has a muscle group", () => {
    expect(planSummary(plan(["", ""]))).toBe("2 exercises");
    expect(planSummary(plan([]))).toBe("0 exercises");
  });
});
