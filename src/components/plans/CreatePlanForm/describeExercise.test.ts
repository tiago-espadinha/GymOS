import { describe, expect, it } from "vitest";
import { describeExercise } from "./describeExercise";

describe("describeExercise", () => {
  it("names category, muscle group and how a set is measured", () => {
    expect(describeExercise({ id: "a", name: "Squat", muscleGroup: "Legs", category: "strength" })).toBe(
      "Strength · Legs · weight × reps",
    );
    expect(describeExercise({ id: "b", name: "Dips", muscleGroup: "Triceps", category: "calisthenics" })).toBe(
      "Calisthenics · Triceps · reps",
    );
    expect(
      describeExercise({ id: "c", name: "Plank", muscleGroup: "Core", category: "calisthenics", trackingType: "time" }),
    ).toBe("Calisthenics · Core · time");
  });

  it("shows the distance unit for distance cardio and treats legacy data as strength", () => {
    expect(
      describeExercise({ id: "d", name: "Run", muscleGroup: "Cardio", category: "cardio", distanceUnit: "mi" }),
    ).toBe("Cardio · Cardio · time + mi");
    expect(describeExercise({ id: "e", name: "Bench", muscleGroup: "Chest" })).toBe("Strength · Chest · weight × reps");
  });

  it("respects a switched-off weight on strength", () => {
    expect(
      describeExercise({ id: "f", name: "Curl", muscleGroup: "Biceps", category: "strength", trackWeight: false }),
    ).toBe("Strength · Biceps · reps");
  });
});
