import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatRestClock, readElapsedMs } from "./useTimer";

describe("formatRestClock", () => {
  it("shows the time left while a rest runs", () => {
    expect(formatRestClock(75_000, 0)).toBe("01:15");
  });

  it("shows +m:ss once the rest is over", () => {
    expect(formatRestClock(0, 15_000)).toBe("+0:15");
    expect(formatRestClock(0, 72_000)).toBe("+1:12");
  });

  it("reads as overtime from the exact end", () => {
    expect(formatRestClock(0, 0)).toBe("+0:00");
  });
});

describe("readElapsedMs", () => {
  const NOW = 1_000_000_000_000;
  let store: Map<string, string>;
  const put = (state: object) =>
    store.set("gym:timer:t", JSON.stringify({ targetMs: 30_000, savedAt: NOW, ...state }));

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

  it("adds the running stretch to the time banked before", () => {
    put({ isRunning: true, startedAt: NOW - 4_000, accumulatedMs: 2_000 });
    expect(readElapsedMs("t", NOW)).toBe(6_000);
  });

  it("counts only the banked time while paused", () => {
    put({ isRunning: false, startedAt: null, accumulatedMs: 2_000 });
    expect(readElapsedMs("t", NOW)).toBe(2_000);
  });

  it("is 0 when there is no timer", () => {
    expect(readElapsedMs("t", NOW)).toBe(0);
  });
});
