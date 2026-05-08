import { describe, expect, it } from "vitest";
import { mergeImport } from "./importData";
import { TrainingPlan, WorkoutSession } from "../types";

const plan = (name: string, exercises: string[]): TrainingPlan => ({
  id: name,
  name,
  desc: "",
  exercises: exercises.map((ex) => ({ id: ex, name: ex, muscleGroup: "" })),
});

const session = (date: string, planName: string, notes = ""): WorkoutSession => ({
  id: `${date}-${planName}`,
  planId: planName,
  planName,
  date,
  notes,
  exercises: [],
});

describe("mergeImport", () => {
  it("adds new plans and sessions and counts them, skipping sessions already there", () => {
    const result = mergeImport([plan("Push", ["Bench"])], [session("2026-11-16", "Push")], {
      plans: [plan("Pull", ["Row"])],
      sessions: [session("2026-11-16", "Push"), session("2026-11-16", "Push", "other notes"), session("2026-11-17", "Pull")],
    });

    expect(result.plans.map((p) => p.name)).toEqual(["Push", "Pull"]);
    expect(result.sessions).toHaveLength(3);
    expect(result).toMatchObject({ addedPlans: 1, addedSessions: 2 });
  });

  it("gives a known plan only its missing exercises, without changing the plan in state", () => {
    const existing = plan("Push", ["Bench"]);
    const before = structuredClone(existing);

    const result = mergeImport([existing], [], { plans: [plan("Push", ["Bench", "Dips"])], sessions: [] });

    expect(result.plans[0].exercises.map((e) => e.name)).toEqual(["Bench", "Dips"]);
    expect(result.plans[0]).not.toBe(existing);
    expect(existing).toEqual(before);
    expect(result.addedPlans).toBe(0);
  });
});
