import type { WorkoutSession } from "../types";
import { computeMetric, type ExerciseMeta, type MetricKind } from "./metrics";

export type TimeRange = "all" | "5" | "10" | "1m" | "3m";

export const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "5", label: "5S" },
  { value: "10", label: "10S" },
  { value: "1m", label: "1M" },
  { value: "3m", label: "3M" },
  { value: "all", label: "All" },
];

export interface ProgressPoint {
  date: string; // YYYY-MM-DD
  value: number;
  label: string;
}

export interface ProgressAnalysis {
  total: number;
  improvements: number;
  stagnations: number;
  delta: number; // last minus first
}

/** One point per session that has a value for this exercise and metric, oldest first. */
export function progressSeries(
  sessions: WorkoutSession[],
  exerciseName: string,
  meta: ExerciseMeta,
  metric: MetricKind,
): ProgressPoint[] {
  const points: ProgressPoint[] = [];
  for (const session of sessions) {
    const ex = session.exercises.find((e) => e.name === exerciseName);
    const result = ex ? computeMetric(ex.sets, meta, metric) : null;
    if (result) points.push({ date: session.date, value: result.value, label: result.label });
  }
  return points.sort((a, b) => a.date.localeCompare(b.date));
}

// The cutoff is computed on the calendar date, so it does not drift with the time zone.
function monthsBefore(today: string, months: number): string {
  const [y, m, d] = today.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 - months, d)).toISOString().slice(0, 10);
}

export function filterRange(points: ProgressPoint[], range: TimeRange, today: string): ProgressPoint[] {
  switch (range) {
    case "all":
      return points;
    case "5":
      return points.slice(-5);
    case "10":
      return points.slice(-10);
    case "1m":
    case "3m": {
      const cutoff = monthsBefore(today, range === "1m" ? 1 : 3);
      return points.filter((p) => p.date >= cutoff);
    }
  }
}

/** The most recent point and the best one in the metric's direction (the first to reach it). */
export function lastAndBest(
  points: ProgressPoint[],
  higherIsBetter: boolean,
): { last: ProgressPoint; best: ProgressPoint } | null {
  if (points.length === 0) return null;
  let best = points[0];
  for (const p of points) {
    if (higherIsBetter ? p.value > best.value : p.value < best.value) best = p;
  }
  return { last: points[points.length - 1], best };
}

/**
 * Counts sessions that beat the one before (improvements) and sessions that
 * matched neither of the two before them (stagnations).
 */
export function analyseProgress(points: ProgressPoint[], higherIsBetter: boolean): ProgressAnalysis {
  const isBetter = (a: number, b: number) => (higherIsBetter ? a > b : a < b);
  let improvements = 0;
  let stagnations = 0;
  for (let i = 1; i < points.length; i++) {
    const val = points[i].value;
    const prev = points[i - 1].value;
    if (isBetter(val, prev)) improvements++;
    else if (i >= 2 && !isBetter(prev, points[i - 2].value)) stagnations++;
  }
  return {
    total: points.length,
    improvements,
    stagnations,
    delta: points.length ? points[points.length - 1].value - points[0].value : 0,
  };
}

/** Splits a metric label such as "100kg × 10" into the big figure and the rest. */
export function splitLabel(label: string): { figure: string; unit: string } {
  const match = label.match(/^([\d.:]+)\s*(.*)$/);
  return match ? { figure: match[1], unit: match[2] } : { figure: label, unit: "" };
}
