import { describe, expect, it } from "vitest";
import { exportToCSV, importFromCSV } from "./csv";
import { TrainingPlan, WorkoutSession } from "../types";

const HEADER = "type,date,name,desc_notes,exercise,muscle,category,tracking,weight,reps,duration,distance";

const plans: TrainingPlan[] = [
  {
    id: "p1",
    name: "Push, heavy",
    desc: 'Bench "first"',
    exercises: [
      { id: "e1", name: "Bench Press", muscleGroup: "Chest", category: "strength", trackingType: "reps" },
      { id: "e2", name: "Plank", muscleGroup: "Core", category: "calisthenics", trackingType: "time" },
    ],
  },
];

const sessions: WorkoutSession[] = [
  {
    id: "s1",
    planId: "p1",
    planName: "Push, heavy",
    date: "2026-11-16",
    notes: "felt strong",
    exercises: [
      {
        id: "e1",
        name: "Bench Press",
        muscleGroup: "Chest",
        category: "strength",
        trackingType: "reps",
        sets: [
          { id: "a", weight: "60", reps: "10" },
          { id: "b", weight: "62.5", reps: "8" },
        ],
      },
      {
        id: "e2",
        name: "Plank",
        muscleGroup: "Core",
        category: "calisthenics",
        trackingType: "time",
        sets: [{ id: "c", weight: "", reps: "", duration: "45" }],
      },
    ],
  },
];

describe("exportToCSV", () => {
  it("writes one row per plan exercise and per logged set, quoting commas and quotes", () => {
    expect(exportToCSV(plans, sessions).split("\n")).toEqual([
      HEADER,
      'plan,,"Push, heavy","Bench ""first""",Bench Press,Chest,strength,reps,,,,',
      'plan,,"Push, heavy","Bench ""first""",Plank,Core,calisthenics,time,,,,',
      'session,2026-11-16,"Push, heavy",felt strong,Bench Press,Chest,strength,reps,60,10,,',
      'session,2026-11-16,"Push, heavy",felt strong,Bench Press,Chest,strength,reps,62.5,8,,',
      'session,2026-11-16,"Push, heavy",felt strong,Plank,Core,calisthenics,time,,,45,',
    ]);
  });
});

describe("importFromCSV", () => {
  it("re-imports an export to equal plans and sessions, ids aside", () => {
    const csv = exportToCSV(plans, sessions);
    const imported = importFromCSV(csv);

    expect(exportToCSV(imported.plans, imported.sessions)).toBe(csv);
    expect(imported.skippedRows).toBe(0);
    expect(imported.plans).toHaveLength(1);
    expect(imported.plans[0]).toMatchObject({ name: "Push, heavy", desc: 'Bench "first"' });
    expect(imported.plans[0].exercises.map((e) => [e.name, e.category, e.trackingType])).toEqual([
      ["Bench Press", "strength", "reps"],
      ["Plank", "calisthenics", "time"],
    ]);
    const [session] = imported.sessions;
    expect(session).toMatchObject({ planName: "Push, heavy", date: "2026-11-16", notes: "felt strong" });
    expect(session.planId).toBe(imported.plans[0].id);
    expect(session.exercises.map((e) => e.sets.map(({ weight, reps, duration }) => ({ weight, reps, duration })))).toEqual([
      [
        { weight: "60", reps: "10", duration: undefined },
        { weight: "62.5", reps: "8", duration: undefined },
      ],
      [{ weight: "", reps: "", duration: "45" }],
    ]);
  });

  it("reads the older eight-column export as strength sets", () => {
    const csv = [
      "type,date,name,desc_notes,exercise,muscle,weight,reps",
      "plan,,Pull,,Row,Back,,",
      "session,2026-01-02,Pull,,Row,Back,50,12",
    ].join("\n");
    const { plans: p, sessions: s } = importFromCSV(csv);

    expect(p[0].exercises[0]).toMatchObject({ name: "Row", category: "strength", trackingType: "reps" });
    expect(s[0].exercises[0].sets[0]).toMatchObject({ weight: "50", reps: "12" });
  });

  it("skips and counts rows with missing columns or fields, keeping the rest", () => {
    const csv = [
      HEADER,
      "plan,,Push,,Bench Press,Chest,strength,reps,,,,",
      "plan,,Push,,Bench Press", // too few columns
      "workout,,Push,,Bench Press,Chest,strength,reps,,,,", // unknown type
      "plan,,,,Bench Press,Chest,strength,reps,,,,", // no plan name
      "session,2026-11-16,Push,,,Chest,strength,reps,60,10,,", // no exercise
      "session,,Push,,Bench Press,Chest,strength,reps,60,10,,", // no date
      "session,2026-11-16,Push,,Bench Press,Chest,strength,reps,60,10,,",
      "",
    ].join("\r\n");
    const result = importFromCSV(csv);

    expect(result.skippedRows).toBe(5);
    expect(result.plans).toHaveLength(1);
    expect(result.sessions).toHaveLength(1);
  });

  it("rejects a file whose header is not an export header", () => {
    expect(() => importFromCSV("name,weight\nBench,60")).toThrow(/does not match/);
    expect(() => importFromCSV("")).toThrow(/does not match/);
  });
});
