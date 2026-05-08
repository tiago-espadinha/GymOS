import { describe, expect, it } from "vitest";
import { formatRestClock } from "./useTimer";

describe("formatRestClock", () => {
  it("shows the time left while a rest runs", () => {
    expect(formatRestClock(75_000, 0)).toBe("01:15");
  });

  it("shows +m:ss once the rest is over", () => {
    expect(formatRestClock(0, 15_000)).toBe("+0:15");
    expect(formatRestClock(0, 72_000)).toBe("+1:12");
  });

  it("shows zero at the exact end, not overtime", () => {
    expect(formatRestClock(0, 0)).toBe("00:00");
  });
});
