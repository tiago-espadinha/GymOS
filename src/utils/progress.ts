import type { Exercise, WorkoutSession } from "../types";
import { DEFAULT_METRIC, computeMetric, getExerciseMeta, type ExerciseMeta, type MetricKind } from "./metrics";

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
  /** Strictly better than every earlier session, set by markPRs. */
  pr?: boolean;
}

export interface ProgressAnalysis {
  total: number;
  /** Points marked as PRs by markPRs. */
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
 * Marks each point that is strictly better than every point before it. The
 * first point has nothing to beat, so it is never a PR. Mark the whole series
 * before filtering a range, so a range never turns an old result into a PR.
 */
export function markPRs(points: ProgressPoint[], higherIsBetter: boolean): ProgressPoint[] {
  let best: number | undefined;
  return points.map((p) => {
    const pr = best !== undefined && (higherIsBetter ? p.value > best : p.value < best);
    if (best === undefined || pr) best = p.value;
    return { ...p, pr };
  });
}

/** The latest point and the best one before it, when the latest is a PR. */
export function newPR(
  points: ProgressPoint[],
  higherIsBetter: boolean,
): { last: ProgressPoint; previous: ProgressPoint } | null {
  const last = points[points.length - 1];
  if (!last?.pr) return null;
  const before = lastAndBest(points.slice(0, -1), higherIsBetter);
  return before && { last, previous: before.best };
}

/**
 * Counts PRs (points marked by markPRs) and sessions that matched neither of
 * the two before them (stagnations).
 */
export function analyseProgress(points: ProgressPoint[], higherIsBetter: boolean): ProgressAnalysis {
  const isBetter = (a: number, b: number) => (higherIsBetter ? a > b : a < b);
  let stagnations = 0;
  for (let i = 2; i < points.length; i++) {
    const val = points[i].value;
    const prev = points[i - 1].value;
    if (!isBetter(val, prev) && !isBetter(prev, points[i - 2].value)) stagnations++;
  }
  return {
    total: points.length,
    improvements: points.filter((p) => p.pr).length,
    stagnations,
    delta: points.length ? points[points.length - 1].value - points[0].value : 0,
  };
}

/**
 * How many sessions chart a value for the exercise, and the latest one's date.
 * Every metric of a branch needs the same sets, so the default metric decides.
 */
export function exerciseHistory(
  sessions: WorkoutSession[],
  exercise: Exercise,
): { count: number; lastDate: string | null } {
  const series = progressSeries(sessions, exercise.name, getExerciseMeta(exercise), DEFAULT_METRIC);
  return { count: series.length, lastDate: series[series.length - 1]?.date ?? null };
}

/** Splits a metric label such as "100kg × 10" into the big figure and the rest. */
export function splitLabel(label: string): { figure: string; unit: string } {
  const match = label.match(/^([\d.:]+)\s*(.*)$/);
  return match ? { figure: match[1], unit: match[2] } : { figure: label, unit: "" };
}
