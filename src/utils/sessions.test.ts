import { describe, expect, it } from "vitest";
import { newestFirst, sessionCells, sessionStats, sessionSummary } from "./sessions";
import { WorkoutSession } from "../types";

const session = (sets: { weight: string; reps: string }[][]): WorkoutSession => ({
  id: "s1",
  planId: "p1",
  planName: "Push",
  date: "2026-11-16",
  notes: "",
  exercises: sets.map((s, i) => ({
    id: `e${i}`,
    name: `Exercise ${i}`,
    muscleGroup: "Chest",
    sets: s.map((set, j) => ({ id: `s${i}${j}`, ...set })),
  })),
});

describe("sessionStats", () => {
  it("counts every set and sums weight times reps across exercises", () => {
    const stats = sessionStats(
      session([
        [
          { weight: "60", reps: "10" },
          { weight: "62.5", reps: "8" },
        ],
        [{ weight: "20", reps: "12" }],
      ]),
    );
    expect(stats).toEqual({ sets: 3, volume: 600 + 500 + 240 });
  });

  it("treats blank or non-numeric values as zero volume but still counts the set", () => {
    expect(sessionStats(session([[{ weight: "", reps: "10" }, { weight: "abc", reps: "" }]]))).toEqual({
      sets: 2,
      volume: 0,
    });
  });
});

describe("sessionCells", () => {
  it("splits a row into sets, volume and notes", () => {
    expect(sessionCells({ sets: 9, volume: 2988.4 }, "Grip\ngave out.")).toEqual({ sets: "9 sets", volume: "2,988 kg", notes: "Grip gave out." });
    expect(sessionCells({ sets: 1, volume: 0 })).toEqual({ sets: "1 set", volume: "", notes: "" });
  });
});

describe("sessionSummary", () => {
  it("joins sets, grouped volume and notes", () => {
    expect(sessionSummary({ sets: 30, volume: 5022 }, "Bonito")).toBe("30 sets · 5,022 kg · Bonito");
  });

  it("uses the singular and omits volume and empty notes", () => {
    expect(sessionSummary({ sets: 1, volume: 0 })).toBe("1 set");
    expect(sessionSummary({ sets: 1, volume: 0 }, "  ")).toBe("1 set");
  });

  it("folds multi-line notes onto one line", () => {
    expect(sessionSummary({ sets: 2, volume: 0 }, "Bonito\nGrip gave out.")).toBe("2 sets · Bonito Grip gave out.");
  });
});

describe("newestFirst", () => {
  const dated = (id: string, date: string): WorkoutSession => ({ ...session([]), id, date });

  it("puts import-appended sessions in date order", () => {
    const stored = [dated("saved", "2026-05-01"), dated("imp-old", "2026-04-20"), dated("imp-new", "2026-05-10")];
    expect(newestFirst(stored).map((s) => s.id)).toEqual(["imp-new", "saved", "imp-old"]);
  });

  it("moves a prepended backdated session below newer ones", () => {
    const stored = [dated("backdated", "2026-05-03"), dated("newer", "2026-05-08"), dated("older", "2026-05-01")];
    expect(newestFirst(stored).map((s) => s.id)).toEqual(["newer", "backdated", "older"]);
  });

  it("keeps save order on the same date and leaves the stored array alone", () => {
    const stored = [dated("second", "2026-05-08"), dated("first", "2026-05-08"), dated("older", "2026-05-01")];
    expect(newestFirst(stored).map((s) => s.id)).toEqual(["second", "first", "older"]);
    expect(stored.map((s) => s.id)).toEqual(["second", "first", "older"]);
  });
});
