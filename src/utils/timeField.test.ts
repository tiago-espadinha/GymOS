import { describe, expect, it } from "vitest";
import { secondsTime, timeSeconds, typedTime } from "./timeField";

describe("typed time", () => {
  it("fills from the right", () => {
    expect(["2", "00:020", "00:200", "02:000"].map(typedTime)).toEqual(["00:02", "00:20", "02:00", "20:00"]);
    expect(typedTime("10500")).toBe("1:05:00");
  });

  it("drops a digit on backspace and empties with the last one", () => {
    expect(typedTime("00:4")).toBe("00:04");
    expect(typedTime("00:0")).toBe("");
  });

  it("reads a colon or none the same, and ignores other characters", () => {
    expect([timeSeconds("21:30"), timeSeconds("2130"), timeSeconds("21m30")]).toEqual([1290, 1290, 1290]);
  });

  it("carries seconds over 59 once settled", () => {
    expect(secondsTime(String(timeSeconds("90")))).toBe("01:30");
  });

  it("round-trips stored seconds, with nothing for no time", () => {
    for (const seconds of [45, 1200, 3900]) expect(timeSeconds(secondsTime(String(seconds)))).toBe(seconds);
    expect([secondsTime(""), secondsTime("0")]).toEqual(["", ""]);
  });
});
