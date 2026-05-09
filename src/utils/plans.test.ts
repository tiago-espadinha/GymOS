import { describe, expect, it } from "vitest";
import {
  archivePlan,
  archivedSummary,
  defaultPlan,
  deletePlan,
  lastTrained,
  muscleGroupsOf,
  planActionsSummary,
  planTrainedSummary,
  planSummary,
  plansCountLabel,
  restorePlan,
} from "./plans";
import { TrainingPlan, WorkoutSession } from "../types";

const plan = (groups: string[], extra: Partial<TrainingPlan> = {}): TrainingPlan => ({
  id: "p",
  name: "Plan",
  desc: "",
  exercises: groups.map((muscleGroup, i) => ({ id: `e${i}`, name: `Ex ${i}`, muscleGroup })),
  ...extra,
});

const session = (planId: string, date: string): WorkoutSession => ({
  id: `${planId}-${date}`,
  planId,
  planName: "Plan",
  date,
  notes: "",
  exercises: [],
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

describe("archive, restore and delete", () => {
  const plans = [plan([], { id: "a" }), plan([], { id: "b" }), plan([], { id: "c" })];

  it("archives in place with the date", () => {
    const next = archivePlan(plans, "b", "2026-03-02");
    expect(next.map((p) => p.id)).toEqual(["a", "b", "c"]);
    expect(next[1]).toMatchObject({ isArchived: true, archivedAt: "2026-03-02" });
    expect(next[0].isArchived).toBeUndefined();
  });

  it("restores in place and drops the archive date", () => {
    const next = restorePlan(archivePlan(plans, "b", "2026-03-02"), "b");
    expect(next.map((p) => p.id)).toEqual(["a", "b", "c"]);
    expect(next[1].isArchived).toBe(false);
    expect("archivedAt" in next[1]).toBe(false);
  });

  it("deletes only the named plan", () => {
    expect(deletePlan(plans, "b").map((p) => p.id)).toEqual(["a", "c"]);
  });
});

describe("dates and labels", () => {
  const sessions = [session("p", "2026-05-02"), session("p", "2026-04-20"), session("q", "2026-06-01")];

  it("finds the latest session of the plan", () => {
    expect(lastTrained("p", sessions)).toBe("2026-05-02");
    expect(lastTrained("none", sessions)).toBeNull();
  });

  it("adds the last trained date to the actions summary when there is one", () => {
    expect(planActionsSummary(plan(["Legs", "Legs"]), sessions, "2026-06-10")).toBe(
      "2 exercises · last trained 2 May",
    );
    expect(planActionsSummary(plan(["Legs"], { id: "x" }), sessions, "2026-06-10")).toBe("1 exercise");
    expect(planActionsSummary(plan(["Legs"]), sessions, "2027-01-01")).toBe(
      "1 exercise · last trained 2 May 2026",
    );
  });

  it("says when an archived plan was archived", () => {
    expect(archivedSummary(plan(["A"], { archivedAt: "2026-06-10" }), "2026-06-10")).toBe("Archived today · 1 exercise");
    expect(archivedSummary(plan(["A", "B"], { archivedAt: "2026-10-12" }), "2026-11-01")).toBe(
      "Archived 12 Oct · 2 exercises",
    );
    expect(archivedSummary(plan(["A"], { isArchived: true }), "2026-11-01")).toBe("Archived · 1 exercise");
  });

  it("counts active and archived plans for the header", () => {
    expect(plansCountLabel(0, 0)).toBe("No plans");
    expect(plansCountLabel(1, 0)).toBe("1 plan");
    expect(plansCountLabel(16, 3)).toBe("16 plans · 3 archived");
    expect(plansCountLabel(0, 2)).toBe("No plans · 2 archived");
  });
});

describe("Log home plan choice", () => {
  const sessions = [session("p", "2026-05-02")];

  it("says when a plan was last trained, or that it never was", () => {
    expect(planTrainedSummary(plan(["A", "B"]), sessions, "2026-06-10")).toBe("2 exercises · last trained 2 May");
    expect(planTrainedSummary(plan(["A"]), sessions, "2026-06-10", "last")).toBe("1 exercise · last 2 May");
    expect(planTrainedSummary(plan(["A"], { id: "x" }), sessions, "2026-06-10")).toBe("1 exercise · not trained yet");
  });

  it("starts on the newest session's plan while it is active, else the first active plan", () => {
    const p = plan(["A"]);
    const q = plan(["B"], { id: "q" });
    expect(defaultPlan([q, p], sessions)).toBe(p);
    expect(defaultPlan([q], sessions)).toBe(q);
    expect(defaultPlan([q, p], [])).toBe(q);
    expect(defaultPlan([], sessions)).toBeUndefined();
  });
});
