import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExerciseLog } from "../types";
import { findRunningRest, restTimerId } from "./restTimers";

const NOW = 1_000_000_000_000;

const exercises: ExerciseLog[] = [
  { id: "e1", name: "Bench", muscleGroup: "Chest", sets: [{ id: "s1", weight: "", reps: "" }] },
  { id: "e2", name: "Row", muscleGroup: "Back", sets: [{ id: "s2", weight: "", reps: "" }] },
];

let store: Map<string, string>;

function putTimer(setId: string, state: object) {
  store.set(`gym:timer:${restTimerId(setId)}`, JSON.stringify({ savedAt: NOW, ...state }));
}

beforeEach(() => {
  store = new Map();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.stubGlobal("localStorage", { getItem: (k: string) => store.get(k) ?? null });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("findRunningRest", () => {
  it("is null when no rest is running", () => {
    putTimer("s1", { isRunning: false, startedAt: null, accumulatedMs: 0, targetMs: 90_000 });
    expect(findRunningRest(exercises, NOW)).toBeNull();
  });

  it("reports the exercise and the time left of a running rest", () => {
    putTimer("s2", { isRunning: true, startedAt: NOW - 30_000, accumulatedMs: 0, targetMs: 90_000 });
    expect(findRunningRest(exercises, NOW)).toEqual({
      exerciseId: "e2",
      exerciseName: "Row",
      remainingMs: 60_000,
    });
  });

  it("counts time banked before a pause and never goes below zero", () => {
    putTimer("s1", { isRunning: true, startedAt: NOW - 10_000, accumulatedMs: 100_000, targetMs: 90_000 });
    expect(findRunningRest(exercises, NOW)?.remainingMs).toBe(0);
  });

  it("picks the rest that started last when two are running", () => {
    putTimer("s1", { isRunning: true, startedAt: NOW - 50_000, accumulatedMs: 0, targetMs: 90_000 });
    putTimer("s2", { isRunning: true, startedAt: NOW - 5_000, accumulatedMs: 0, targetMs: 90_000 });
    expect(findRunningRest(exercises, NOW)?.exerciseId).toBe("e2");
  });

  it("ignores a rest from another session and a stale one", () => {
    store.set(`gym:timer:${restTimerId("other")}`, JSON.stringify({ isRunning: true, startedAt: NOW, accumulatedMs: 0, targetMs: 1, savedAt: NOW }));
    putTimer("s1", { isRunning: true, startedAt: NOW, accumulatedMs: 0, targetMs: 90_000, savedAt: 0 });
    expect(findRunningRest(exercises, NOW)).toBeNull();
  });
});
