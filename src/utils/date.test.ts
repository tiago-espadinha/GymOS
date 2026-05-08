import { describe, expect, it } from "vitest";
import { formatDateKicker, formatDateMeta, formatDateStat } from "./date";

describe("formatDateKicker", () => {
  it("reads as weekday, day and month in capitals", () => {
    expect(formatDateKicker("2026-11-15")).toBe("SUN 15 NOV");
  });
});

describe("formatDateStat", () => {
  it("leaves out the year within the current year", () => {
    expect(formatDateStat("2026-05-04", "2026-11-22")).toBe("4 MAY");
  });

  it("adds the year for an earlier year", () => {
    expect(formatDateStat("2023-11-27", "2026-11-22")).toBe("27 NOV 2023");
  });
});

describe("formatDateMeta", () => {
  it("reads as weekday, day and month without a comma", () => {
    expect(formatDateMeta("2026-11-15")).toBe("Sun 15 Nov");
  });
});
