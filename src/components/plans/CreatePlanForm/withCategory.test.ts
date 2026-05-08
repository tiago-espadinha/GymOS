import { describe, expect, it } from "vitest";
import { withCategory } from "./withCategory";
import { Exercise } from "../../../types";

const base: Exercise = { id: "e", name: "X", muscleGroup: "Chest", category: "strength" };

describe("withCategory", () => {
  it("applies the category's tracking defaults", () => {
    expect(withCategory(base, "cardio")).toMatchObject({
      category: "cardio",
      trackingType: "time",
      trackWeight: false,
      trackDistance: true,
    });
    expect(withCategory(base, "calisthenics")).toMatchObject({
      trackingType: "reps",
      trackWeight: false,
      trackDistance: false,
    });
  });

  it("moves the untouched muscle group to Cardio and back", () => {
    const cardio = withCategory(base, "cardio");
    expect(cardio.muscleGroup).toBe("Cardio");
    expect(withCategory(cardio, "strength").muscleGroup).toBe("Chest");
  });

  it("keeps a muscle group the user picked", () => {
    expect(withCategory({ ...base, muscleGroup: "Legs" }, "cardio").muscleGroup).toBe("Legs");
  });

  it("leaves the exercise untouched when its category is chosen again", () => {
    const tuned: Exercise = {
      ...withCategory(base, "cardio"),
      trackDistance: false,
      timeGoal: "shorter",
    };
    expect(withCategory(tuned, "cardio")).toBe(tuned);
  });
});
