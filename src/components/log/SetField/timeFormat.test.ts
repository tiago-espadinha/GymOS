import { describe, expect, it } from "vitest";
import { timeFormat } from "./timeFormat";

describe("time field format", () => {
  it("stores whole seconds, and nothing for an empty field", () => {
    expect([timeFormat.store(timeFormat.type("2000")), timeFormat.store(timeFormat.type("0"))]).toEqual(["1200", ""]);
  });

  it("carries seconds over 59 on leaving", () => {
    expect(timeFormat.settle?.("00:90")).toBe("01:30");
  });
});
