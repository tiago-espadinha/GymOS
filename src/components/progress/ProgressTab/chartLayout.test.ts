import { describe, expect, it } from "vitest";
import { lineStart, type Box } from "./chartLayout";

// A 343px phone chart: labels at x 16, 18px wide, just above grid lines at y 28 and 95; floor at 162.
const labels: Box[] = [
  { left: 16, top: 10, right: 34, bottom: 26 },
  { left: 16, top: 77, right: 34, bottom: 93 },
];
const base = { minX: 16, endX: 327, labels, radius: 8, halfStroke: 1.5, clearance: 4 };
const fullGutter = 34 + 8 + 4;

describe("lineStart", () => {
  it("starts a rising line at the content edge, under the labels", () => {
    expect(lineStart({ ...base, ys: [160, 140, 120, 100, 80, 60, 40, 28] })).toBe(16);
  });

  it("moves a line past the labels when it would run through them", () => {
    const start = lineStart({ ...base, ys: [28, 60, 95, 120, 160] });
    expect(start).toBeGreaterThan(16);
    expect(start).toBeLessThanOrEqual(fullGutter);
  });

  it("moves a flat line that sits on a labelled grid line", () => {
    expect(lineStart({ ...base, ys: [95, 95, 95, 95] })).toBe(fullGutter);
  });

  it("starts a flat line between the labels at the content edge", () => {
    expect(lineStart({ ...base, ys: [60, 60, 60] })).toBe(16);
  });

  it("only moves as far as needed when the first point brushes a label", () => {
    // First point 20px under the lower label's box: a node needs 12px, so it fits.
    expect(lineStart({ ...base, ys: [113, 130, 150] })).toBe(16);
    // 8px under it: the node clips the label, so the line steps right of it.
    expect(lineStart({ ...base, ys: [101, 130, 150] })).toBe(fullGutter);
  });

  it("leaves a single point midway, clear of the labels", () => {
    const start = lineStart({ ...base, ys: [95] });
    expect((start + base.endX) / 2).toBeGreaterThan(fullGutter);
  });

  it("uses the minimum when there are no labels or points", () => {
    expect(lineStart({ ...base, labels: [], ys: [95] })).toBe(16);
    expect(lineStart({ ...base, ys: [] })).toBe(16);
  });
});
