import { describe, expect, it } from "vitest";
import { sessionStats, sessionSummary } from "./sessions";
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

describe("sessionSummary", () => {
  it("joins date, sets and volume", () => {
    expect(sessionSummary("Nov 16, 26", { sets: 12, volume: 4200 })).toBe("Nov 16, 26 · 12 sets · 4200 kg");
  });

  it("uses the singular and omits volume when nothing was lifted", () => {
    expect(sessionSummary("Nov 16, 26", { sets: 1, volume: 0 })).toBe("Nov 16, 26 · 1 set");
  });
});
