import { describe, expect, it } from "vitest";
import { exportToCSV, importFromCSV } from "./csv";
import { distanceText, storedWeight, weightText } from "./units";
import { TrainingPlan, WorkoutSession } from "../types";

const UNITLESS_HEADER = "type,date,name,desc_notes,exercise,muscle,category,tracking,weight,reps,duration,distance";
const HEADER = `${UNITLESS_HEADER},weight_unit,distance_unit`;

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
      'plan,,"Push, heavy","Bench ""first""",Bench Press,Chest,strength,reps,,,,,,',
      'plan,,"Push, heavy","Bench ""first""",Plank,Core,calisthenics,time,,,,,,',
      'session,2026-11-16,"Push, heavy",felt strong,Bench Press,Chest,strength,reps,60,10,,,kg,km',
      'session,2026-11-16,"Push, heavy",felt strong,Bench Press,Chest,strength,reps,62.5,8,,,kg,km',
      'session,2026-11-16,"Push, heavy",felt strong,Plank,Core,calisthenics,time,,,45,,kg,km',
    ]);
  });

  it("writes session values in lb and mi, and each exercise's own distance unit on its plan row", () => {
    const rows = exportToCSV(runPlans, runSessions("100", "5"), { weight: "lbs", distance: "mi" }).split("\n");
    expect(rows.slice(1)).toEqual([
      "plan,,Cardio,,Run,Cardio,cardio,time,,,,,,mi",
      "plan,,Cardio,,Bike,Cardio,cardio,time,,,,,,",
      "session,2026-11-16,Cardio,,Run,Cardio,cardio,time,220.46,,1500,3.11,lb,mi",
    ]);
  });
});

// A run stored in km in its session, and a plan whose Run exercise stores mi.
const runPlans: TrainingPlan[] = [
  {
    id: "c1",
    name: "Cardio",
    desc: "",
    exercises: [
      { id: "r", name: "Run", muscleGroup: "Cardio", category: "cardio", trackingType: "time", trackDistance: true, distanceUnit: "mi" },
      { id: "b", name: "Bike", muscleGroup: "Cardio", category: "cardio", trackingType: "time", trackDistance: true },
    ],
  },
];
const runSessions = (weight: string, distance: string, distanceUnit: "km" | "mi" = "km"): WorkoutSession[] => [
  {
    id: "s",
    planId: "c1",
    planName: "Cardio",
    date: "2026-11-16",
    notes: "",
    exercises: [
      {
        id: "r", name: "Run", muscleGroup: "Cardio", category: "cardio", trackingType: "time", distanceUnit,
        sets: [{ id: "x", weight, reps: "", duration: "1500", distance }],
      },
    ],
  },
];

describe("importFromCSV with units", () => {
  const setOf = (csv: string) => importFromCSV(csv).sessions[0].exercises[0].sets[0];

  it("re-imports values entered in the export's units exactly, and keeps the exercise's distance unit", () => {
    const kg = storedWeight("135", "lbs");
    const sessions = runSessions(kg, "3.1", "mi");
    const imported = importFromCSV(exportToCSV(runPlans, sessions, { weight: "lbs", distance: "mi" }));

    expect(imported.skippedRows).toBe(0);
    expect(imported.plans[0].exercises.map((e) => e.distanceUnit)).toEqual(["mi", undefined]);
    expect(imported.sessions[0].exercises[0].distanceUnit).toBe("mi");
    expect(imported.sessions[0].exercises[0].sets[0]).toMatchObject({ weight: kg, distance: "3.1", duration: "1500" });
  });

  it("re-imports values converted on export equal at display precision", () => {
    const csv = exportToCSV(runPlans, runSessions("100", "5", "mi"), { weight: "lbs", distance: "km" });
    const set = setOf(csv);
    expect(weightText(set.weight, "kg")).toBe("100");
    expect(distanceText(set.distance!, "mi", "mi")).toBe("5");
    expect(exportToCSV(importFromCSV(csv).plans, importFromCSV(csv).sessions, { weight: "lbs", distance: "km" })).toBe(csv);
  });

  it("converts each row by its own units", () => {
    const csv = [
      HEADER,
      "session,2026-11-16,Push,,Bench,Chest,strength,reps,100,5,,,kg,km",
      "session,2026-11-16,Push,,Bench,Chest,strength,reps,135,5,,,lb,km",
      "session,2026-11-16,Push,,Bench,Chest,strength,reps,135,5,,,lbs,km",
      "session,2026-11-17,Push,,Run,Cardio,cardio,time,,,1500,3.1,kg,mi",
    ].join("\n");
    const { sessions } = importFromCSV(csv);
    expect(sessions[0].exercises[0].sets.map((s) => s.weight)).toEqual(["100", storedWeight("135", "lbs"), storedWeight("135", "lbs")]);
    expect(Number(sessions[1].exercises[0].sets[0].distance)).toBeCloseTo(4.98897, 5);
  });

  it("skips rows whose numbers have a missing or unknown unit", () => {
    const csv = [
      HEADER,
      "plan,,Push,,Bench,Chest,strength,reps,,,,,,furlong", // unknown distance unit
      "session,2026-11-16,Push,,Bench,Chest,strength,reps,100,5,,,stone,km", // unknown weight unit
      "session,2026-11-16,Push,,Bench,Chest,strength,reps,100,5,,,,km", // weight without a unit
      "session,2026-11-16,Push,,Run,Cardio,cardio,time,,,1500,5,kg,", // distance without a unit
      "session,2026-11-16,Push,,Bench,Chest,strength,reps,100,5,,", // 12 columns under the 14-column header
      "plan,,Push,,Run,Cardio,cardio,time,,,,,,__proto__", // not a unit, even if an object key
      "session,2026-11-16,Push,,Bench,Chest,strength,reps,,15,,,,", // no weight, no unit needed
    ].join("\n");
    const result = importFromCSV(csv);
    expect(result.skippedRows).toBe(6);
    expect(result.sessions[0].exercises[0].sets[0]).toMatchObject({ weight: "", reps: "15" });
  });

  it("reads the 12-column export as kg and each exercise's own distance unit", () => {
    const csv = [UNITLESS_HEADER, "session,2026-11-16,Push,,Run,Cardio,cardio,time,20,,1500,3.1"].join("\n");
    expect(setOf(csv)).toMatchObject({ weight: "20", distance: "3.1" });
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

  it("round-trips notes and names with line breaks, quotes and commas", () => {
    const notes = ['line one\nline two', '\nstarts and ends\n', 'said "go", then\r\nwent', ""];
    const multiline: WorkoutSession[] = notes.map((note, i) => ({
      ...sessions[0],
      id: `s${i}`,
      date: `2026-11-1${i}`,
      notes: note,
    }));
    const plan: TrainingPlan = { ...plans[0], desc: "warm up\nthen bench" };
    const csv = exportToCSV([plan], multiline);
    const imported = importFromCSV(csv);

    expect(imported.skippedRows).toBe(0);
    expect(imported.plans[0].desc).toBe("warm up\nthen bench");
    expect(imported.sessions.map((s) => s.notes)).toEqual(notes);
    expect(imported.sessions.flatMap((s) => s.exercises.flatMap((e) => e.sets))).toHaveLength(12);
    expect(exportToCSV(imported.plans, imported.sessions)).toBe(csv);
  });

  it("rejects a file with a quoted value that is never closed", () => {
    const csv = [HEADER, 'session,2026-11-16,Push,"open note,Bench Press,Chest,strength,reps,60,10,,'].join("\n");

    expect(() => importFromCSV(csv)).toThrow(/never closed/);
  });

  it("keeps a quote inside an unquoted value and padding around a row from merging or skipping rows", () => {
    const csv = [
      UNITLESS_HEADER,
      'plan,,Push,5\'10" lifter,Bench Press,Chest,strength,reps,,,,',
      "  session,2026-11-16,Push,,Bench Press,Chest,strength,reps,60,10,,  ",
      "session,2026-11-17,Push,,Bench Press,Chest,strength,reps,62.5,8,,",
    ].join("\n");
    const result = importFromCSV(csv);

    expect(result.skippedRows).toBe(0);
    expect(result.plans[0].desc).toBe('5\'10" lifter');
    expect(result.sessions).toHaveLength(2);
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
      UNITLESS_HEADER,
      "plan,,Push,,Bench Press,Chest,strength,reps,,,,",
      "plan,,Push,,Bench Press", // too few columns
      "workout,,Push,,Bench Press,Chest,strength,reps,,,,", // unknown type
      "plan,,,,Bench Press,Chest,strength,reps,,,,", // no plan name
      "session,2026-11-16,Push,,,Chest,strength,reps,60,10,,", // no exercise
      "session,,Push,,Bench Press,Chest,strength,reps,60,10,,", // no date
      "plan,,Push,,Dips,Chest,yoga,reps,,,,", // unknown category
      "session,2026-11-16,Push,,Bench Press,Chest,strength,laps,60,10,,", // unknown tracking
      "session,2026-11-16,Push,,Bench Press,Chest,strength,reps,60,10,,",
      "",
    ].join("\r\n");
    const result = importFromCSV(csv);

    expect(result.skippedRows).toBe(7);
    expect(result.plans).toHaveLength(1);
    expect(result.sessions).toHaveLength(1);
  });

  it("rejects a file whose header is not an export header", () => {
    expect(() => importFromCSV("name,weight\nBench,60")).toThrow(/does not match/);
    expect(() => importFromCSV("")).toThrow(/does not match/);
  });
});
