import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  dayBefore,
  formatDateFull,
  formatDateKicker,
  formatDateMeta,
  formatDateSpoken,
  formatDateStat,
  formatDayMonthYear,
  formatMonthYear,
  maskDayMonthYear,
  monthWeeks,
  parseDayMonthYear,
} from "./date";

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

describe("addDays and addMonths", () => {
  it("steps across month and year ends", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -7)).toBe("2026-02-22");
  });

  it("keeps the day inside a shorter month", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2024-03-31", -1)).toBe("2024-02-29");
    expect(addMonths("2026-11-15", -12)).toBe("2025-11-15");
  });
});

describe("DD/MM/YYYY", () => {
  it("formats and parses day, month and year", () => {
    expect(formatDayMonthYear("2026-11-05")).toBe("05/11/2026");
    expect(parseDayMonthYear("05/11/2026")).toBe("2026-11-05");
  });

  it("refuses dates that do not exist or are half typed", () => {
    expect(parseDayMonthYear("31/02/2026")).toBeNull();
    expect(parseDayMonthYear("29/02/2025")).toBeNull();
    expect(parseDayMonthYear("00/01/2026")).toBeNull();
    expect(parseDayMonthYear("12/13/2026")).toBeNull();
    expect(parseDayMonthYear("5/11/2026")).toBeNull();
    expect(parseDayMonthYear("05/11/202")).toBeNull();
    expect(parseDayMonthYear("29/02/2024")).toBe("2024-02-29");
  });

  it("adds slashes while typing forward and lets Backspace pass them", () => {
    expect(maskDayMonthYear("0", "")).toBe("0");
    expect(maskDayMonthYear("05", "0")).toBe("05/");
    expect(maskDayMonthYear("05/1", "05/")).toBe("05/1");
    expect(maskDayMonthYear("05/11", "05/1")).toBe("05/11/");
    expect(maskDayMonthYear("05/11/20261", "05/11/2026")).toBe("05/11/2026");
    expect(maskDayMonthYear("05/11", "05/11/")).toBe("05/11");
    expect(maskDayMonthYear("05/1", "05/11")).toBe("05/1");
    expect(maskDayMonthYear("05112026", "")).toBe("05/11/2026");
    expect(maskDayMonthYear("ab05-11", "")).toBe("05/11/");
  });
});

describe("calendar labels", () => {
  it("names the month and the day in full", () => {
    expect(formatMonthYear("2026-11-25")).toBe("November 2026");
    expect(formatDateSpoken("2026-11-25")).toBe("Wednesday 25 November 2026");
  });
});

describe("monthWeeks", () => {
  it("starts weeks on Monday and pads with null", () => {
    const weeks = monthWeeks("2026-11-25");
    // 1 Nov 2026 is a Sunday: six empty cells before it.
    expect(weeks[0]).toEqual([null, null, null, null, null, null, "2026-11-01"]);
    expect(weeks).toHaveLength(6);
    expect(weeks[5]).toEqual(["2026-11-30", null, null, null, null, null, null]);
  });

  it("fits a February that starts on Monday in four weeks", () => {
    const weeks = monthWeeks("2027-02-10");
    expect(weeks).toHaveLength(4);
    expect(weeks[0][0]).toBe("2027-02-01");
    expect(weeks[3][6]).toBe("2027-02-28");
  });
});
