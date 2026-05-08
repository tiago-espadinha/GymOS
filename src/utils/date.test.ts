import { describe, expect, it } from "vitest";
import { formatDateKicker } from "./date";

describe("formatDateKicker", () => {
  it("reads as weekday, day and month in capitals", () => {
    expect(formatDateKicker("2026-11-15")).toBe("SUN 15 NOV");
  });
});
