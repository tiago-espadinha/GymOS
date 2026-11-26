import { describe, expect, it } from "vitest";
import {
  archivePlan,
  archivedSummary,
  carryRenames,
  defaultPlan,
  deletePlan,
  lastTrained,
  muscleGroupsOf,
  neighbourOf,
  planDetailKicker,
  planActionsSummary,
  planPreview,
  planTrainedSummary,
  planSummary,
  plansTitle,
  renameNote,
  restorePlan,
  updatePlan,
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

describe("plan preview", () => {
  it("lists the first four names and counts the rest", () => {
    expect(planPreview(plan(["A", "B", "C", "D", "E", "F"]))).toEqual({
      names: ["Ex 0", "Ex 1", "Ex 2", "Ex 3"],
      more: 2,
    });
  });

  it("has nothing more when the plan fits", () => {
    expect(planPreview(plan(["A", "B", "C", "D"]))).toEqual({ names: ["Ex 0", "Ex 1", "Ex 2", "Ex 3"], more: 0 });
    expect(planPreview(plan([]))).toEqual({ names: [], more: 0 });
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

  it("counts active plans in the screen title", () => {
    expect(plansTitle(0)).toBe("Plans");
    expect(plansTitle(1)).toBe("1 Plan");
    expect(plansTitle(16)).toBe("16 Plans");
  });
});

describe("Log home plan choice", () => {
  const sessions = [session("p", "2026-05-02")];

  it("says when a plan was last trained, or that it never was", () => {
    expect(planTrainedSummary(plan(["A", "B"]), sessions, "2026-06-10")).toBe("2 exercises · last trained 2 May");
    expect(planTrainedSummary(plan(["A"]), sessions, "2026-06-10", "last")).toBe("1 exercise · last 2 May");
    expect(planTrainedSummary(plan(["A"], { id: "x" }), sessions, "2026-06-10")).toBe("1 exercise · not trained yet");
  });

  it("heads a plan's detail with when it was last trained", () => {
    expect(planDetailKicker(plan(["A"]), sessions, "2026-06-10")).toBe("Plan · last trained 2 May");
    expect(planDetailKicker(plan(["A"], { id: "x" }), sessions, "2026-06-10")).toBe("Plan · not trained yet");
  });

  it("picks the next plan when one leaves the list, the previous one when it was last", () => {
    const [a, b, c] = ["a", "b", "c"].map((id) => plan(["A"], { id }));
    expect(neighbourOf([a, b, c], "a")).toBe(b);
    expect(neighbourOf([a, b, c], "b")).toBe(c);
    expect(neighbourOf([a, b, c], "c")).toBe(b);
    expect(neighbourOf([a], "a")).toBeUndefined();
    expect(neighbourOf([a, b], "x")).toBeUndefined();
  });

  it("starts on the newest session's plan while it is active, else the first active plan", () => {
    const p = plan(["A"]);
    const q = plan(["B"], { id: "q" });
    expect(defaultPlan([q, p], sessions)).toBe(p);
    expect(defaultPlan([q], sessions)).toBe(q);
    expect(defaultPlan([q, p], [])).toBe(q);
    expect(defaultPlan([], sessions)).toBeUndefined();
  });

  it("takes the newest session by date, not storage order", () => {
    const p = plan(["A"]);
    const q = plan(["B"], { id: "q" });
    // An imported newer session appended after a saved older one.
    expect(defaultPlan([p, q], [session("p", "2026-05-01"), session("q", "2026-05-10")])).toBe(q);
  });
});

describe("editing a plan", () => {
  const before: TrainingPlan = {
    id: "p1",
    name: "Push",
    desc: "",
    exercises: [
      { id: "e1", name: "Bench press", muscleGroup: "Chest" },
      { id: "e2", name: "Dips", muscleGroup: "Chest" },
    ],
  };
  const logged = (id: string, planId: string, names: [string, string][]): WorkoutSession => ({
    id,
    planId,
    planName: planId === "p1" ? "Push" : "Other",
    date: "2026-11-01",
    notes: "",
    exercises: names.map(([exId, name]) => ({ id: exId, name, muscleGroup: "Chest", sets: [] })),
  });
  const renameBench = { ...before, exercises: [{ ...before.exercises[0], name: "Barbell bench" }, before.exercises[1]] };

  it("replaces the plan in place, keeping its position and archive state", () => {
    const archived = { ...before, isArchived: true, archivedAt: "2026-10-01" };
    const other = { ...before, id: "p2", name: "Pull" };
    const edited = { ...renameBench, name: "Push A" };
    const next = updatePlan([other, archived], edited);
    expect(next[0]).toBe(other);
    expect(next[1]).toEqual({ ...edited, isArchived: true, archivedAt: "2026-10-01" });
  });

  it("carries an exercise rename into this plan's sessions only, matched by id", () => {
    const own = logged("s1", "p1", [["e1", "Bench press"], ["e2", "Dips"]]);
    const imported = logged("s2", "p1", [["x9", "Bench press"]]);
    const otherPlan = logged("s3", "p2", [["e1", "Bench press"]]);
    const { sessions, changed } = carryRenames([own, imported, otherPlan], before, renameBench);
    expect(changed).toBe(1);
    expect(sessions[0].exercises.map((e) => e.name)).toEqual(["Barbell bench", "Dips"]);
    expect(sessions[0].planName).toBe("Push");
    expect(sessions[1]).toBe(imported);
    expect(sessions[2]).toBe(otherPlan);
  });

  it("carries a plan rename into every session of the plan", () => {
    const a = logged("s1", "p1", [["e2", "Dips"]]);
    const b = logged("s2", "p1", []);
    const { sessions, changed } = carryRenames([a, b], before, { ...before, name: "Push A" });
    expect(changed).toBe(2);
    expect(sessions.map((s) => s.planName)).toEqual(["Push A", "Push A"]);
    expect(sessions[0].exercises[0].name).toBe("Dips");
  });

  it("leaves past sessions alone when exercises are removed, added or retyped", () => {
    const own = logged("s1", "p1", [["e1", "Bench press"], ["e2", "Dips"]]);
    const after: TrainingPlan = {
      ...before,
      exercises: [{ ...before.exercises[0], muscleGroup: "Triceps" }, { id: "e3", name: "Fly", muscleGroup: "Chest" }],
    };
    const { sessions, changed } = carryRenames([own], before, after);
    expect(changed).toBe(0);
    expect(sessions[0]).toBe(own);
  });

  it("says what a rename does to history, or nothing when no session changes", () => {
    expect(renameNote(before, renameBench, 6)).toBe("Bench press is now Barbell bench in 6 past sessions and in Stats.");
    expect(renameNote(before, { ...before, name: "Push A" }, 1)).toBe("Push is now Push A in 1 past session.");
    expect(renameNote(before, { ...renameBench, name: "Push A" }, 3)).toBe("2 renames carry into 3 past sessions and Stats.");
    expect(renameNote(before, renameBench, 0)).toBeNull();
    const cleared = { ...before, exercises: [{ ...before.exercises[0], name: "" }, before.exercises[1]] };
    const own = logged("s1", "p1", [["e1", "Bench press"]]);
    expect(renameNote(before, cleared, carryRenames([own], before, cleared).changed)).toBeNull();
  });
});
