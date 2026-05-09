import { describe, expect, it } from "vitest";
import { dayBefore, formatDateFull, formatDateKicker, formatDateMeta, formatDateStat } from "./date";

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

describe("formatDateFull", () => {
  it("reads as day, short month and year", () => {
    expect(formatDateFull("2026-05-07")).toBe("7 May 2026");
  });
});

describe("dayBefore", () => {
  it("steps back across a month and a year", () => {
    expect(dayBefore("2026-11-15")).toBe("2026-11-14");
    expect(dayBefore("2024-03-01")).toBe("2024-02-29");
    expect(dayBefore("2026-01-01")).toBe("2025-12-31");
  });
});
