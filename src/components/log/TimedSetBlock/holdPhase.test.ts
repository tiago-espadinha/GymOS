import { describe, expect, it } from "vitest";
import type { TimerControls } from "../../../hooks/useTimer";
import { holdPhase } from "./holdPhase";

const timer = (state: Pick<TimerControls, "isRunning" | "elapsedMs" | "isComplete">) => state as TimerControls;

describe("holdPhase", () => {
  it("is ready before the hold starts", () => {
    expect(holdPhase(timer({ isRunning: false, elapsedMs: 0, isComplete: false }))).toBe("ready");
  });

  it("is running under the target and over past it", () => {
    expect(holdPhase(timer({ isRunning: true, elapsedMs: 5_000, isComplete: false }))).toBe("running");
    expect(holdPhase(timer({ isRunning: true, elapsedMs: 50_000, isComplete: true }))).toBe("over");
  });

  it("is paused once stopped with time held, past the target too", () => {
    expect(holdPhase(timer({ isRunning: false, elapsedMs: 5_000, isComplete: false }))).toBe("paused");
    expect(holdPhase(timer({ isRunning: false, elapsedMs: 50_000, isComplete: true }))).toBe("paused");
  });
});
