import { Exercise, Set, ExerciseCategory, TrackingType } from "../types";
import { DEFAULT_TRACKING_TYPE } from "../constants/exerciseTypes";
import { formatClock } from "../hooks/useTimer";

export type MetricKind = "average" | "peak" | "total" | "e1rm";
export type TimeGoal = "longer" | "shorter";

// The four possible "shapes" a set of sets can take, driving which formulas
// apply. Resolved from category/trackingType/trackDistance rather than
// stored directly, so it stays consistent even for edge cases like a
// "strength" exercise that happens to be time-tracked (e.g. a loaded carry).
export type MetricBranch = "strength" | "reps" | "time" | "distance";

export interface ExerciseMeta {
  category: ExerciseCategory;
  trackingType: TrackingType;
  trackWeight: boolean;
  trackDistance: boolean;
  timeGoal: TimeGoal;
  distanceUnit: "km" | "mi";
}

export interface MetricResult {
  value: number; // comparable/chartable number
  label: string; // short display string, e.g. "100kg × 10", "14 reps (+15kg)"
  subtitle?: string; // e.g. "from 100kg × 10" for e1RM
  higherIsBetter: boolean; // direction for progress-chart coloring
}

type MinimalExercise = Pick<
  Exercise,
  "category" | "trackingType" | "trackWeight" | "trackDistance" | "timeGoal" | "distanceUnit"
>;

export function getExerciseMeta(ex: MinimalExercise): ExerciseMeta {
  const category = ex.category || "strength";
  const trackingType = ex.trackingType || DEFAULT_TRACKING_TYPE[category];
  return {
    category,
    trackingType,
    trackWeight: ex.trackWeight ?? category === "strength",
    trackDistance: ex.trackDistance ?? category === "cardio",
    timeGoal: ex.timeGoal || "longer",
    distanceUnit: ex.distanceUnit || "km",
  };
}

export function resolveBranch(meta: ExerciseMeta): MetricBranch {
  if (meta.trackingType === "reps") {
    // Weight × reps and e1RM need a weight; strength logged without one charts as reps.
    return meta.category === "strength" && meta.trackWeight ? "strength" : "reps";
  }
  return meta.trackDistance ? "distance" : "time";
}

export function availableMetrics(branch: MetricBranch): MetricKind[] {
  return branch === "strength"
    ? ["average", "peak", "total", "e1rm"]
    : ["average", "peak", "total"];
}

// Every branch defaults to "average" - it's the most representative single
// number for "how did this session go", vs. peak (one set) or total (skewed
// by how many sets you happened to do).
export const DEFAULT_METRIC: MetricKind = "average";

export const METRIC_LABELS: Record<MetricKind, string> = {
  average: "Average",
  peak: "Peak",
  total: "Total",
  e1rm: "e1RM",
};

function num(v: string | undefined): number {
  const n = parseFloat(v || "");
  return isNaN(n) ? 0 : n;
}

function pickBestStrengthSet(sets: Set[]): Set | undefined {
  let best: Set | undefined;
  let bestScore = -Infinity;
  for (const s of sets) {
    const w = num(s.weight);
    const r = num(s.reps);
    if (w <= 0 || r <= 0) continue;
    const score = w * r;
    if (!best || score > bestScore || (score === bestScore && w > num(best.weight))) {
      best = s;
      bestScore = score;
    }
  }
  return best;
}

function pickBestRepsSet(sets: Set[]): Set | undefined {
  let best: Set | undefined;
  for (const s of sets) {
    const r = num(s.reps);
    if (r <= 0) continue;
    if (!best || r > num(best.reps) || (r === num(best.reps) && num(s.weight) > num(best.weight))) {
      best = s;
    }
  }
  return best;
}

function pickBestTimeSet(sets: Set[], goal: TimeGoal): Set | undefined {
  let best: Set | undefined;
  for (const s of sets) {
    const d = num(s.duration);
    if (d <= 0) continue;
    if (!best) {
      best = s;
      continue;
    }
    const bestD = num(best.duration);
    if (goal === "longer" ? d > bestD : d < bestD) best = s;
  }
  return best;
}

function pickBestDistanceSet(sets: Set[]): Set | undefined {
  let best: Set | undefined;
  for (const s of sets) {
    const d = num(s.distance);
    if (d <= 0) continue;
    if (!best || d > num(best.distance)) best = s;
  }
  return best;
}

export function higherIsBetterFor(branch: MetricBranch, metric: MetricKind, timeGoal: TimeGoal): boolean {
  if (branch === "time" && (metric === "average" || metric === "peak")) {
    return timeGoal === "longer";
  }
  return true;
}

// Formats a bare number (e.g. a session's metric value, or a delta between
// two sessions) according to the branch's units. Doesn't include the
// set-level detail (reps, added-weight notes) that `computeMetric`'s
// `.label` carries - use that instead when you have the actual sets.
export function formatMetricNumber(value: number, meta: ExerciseMeta, metric: MetricKind): string {
  const branch = resolveBranch(meta);
  if (branch === "strength") {
    return metric === "average" ? `${value.toFixed(1)} kg/rep` : `${value.toFixed(1)} kg`;
  }
  if (branch === "reps") {
    return `${value.toFixed(1)} reps`;
  }
  if (branch === "time") {
    return formatClock(Math.max(0, value) * 1000);
  }
  return `${value.toFixed(2)} ${meta.distanceUnit}`;
}

/**
 * Computes a single Average/Peak/Total/e1RM value + display label for one
 * session's worth of sets. Returns null if there's nothing valid to show.
 */
export function computeMetric(
  sets: Set[],
  meta: ExerciseMeta,
  metric: MetricKind,
): MetricResult | null {
  const branch = resolveBranch(meta);
  const higherIsBetter = higherIsBetterFor(branch, metric, meta.timeGoal);

  if (branch === "strength") {
    const valid = sets.filter((s) => num(s.weight) > 0 && num(s.reps) > 0);
    if (valid.length === 0) return null;
    const totalReps = valid.reduce((sum, s) => sum + num(s.reps), 0);
    const volume = valid.reduce((sum, s) => sum + num(s.weight) * num(s.reps), 0);
    const average = totalReps > 0 ? volume / totalReps : 0;
    const peakSet = pickBestStrengthSet(valid);
    const peakWeight = peakSet ? num(peakSet.weight) : 0;
    const peakReps = peakSet ? num(peakSet.reps) : 0;

    switch (metric) {
      case "average":
        return { value: average, label: `${average.toFixed(1)} kg/rep`, higherIsBetter };
      case "peak":
        return { value: peakWeight, label: `${peakWeight}kg × ${peakReps}`, higherIsBetter };
      case "total":
        return { value: volume, label: `${volume.toFixed(0)} kg`, higherIsBetter };
      case "e1rm": {
        const e1rm = peakWeight * (1 + peakReps / 30);
        return {
          value: e1rm,
          label: `${e1rm.toFixed(1)} kg`,
          subtitle: peakSet ? `from ${peakWeight}kg × ${peakReps}` : undefined,
          higherIsBetter,
        };
      }
    }
  }

  if (branch === "reps") {
    const valid = sets.filter((s) => num(s.reps) > 0);
    if (valid.length === 0) return null;
    const totalReps = valid.reduce((sum, s) => sum + num(s.reps), 0);
    const average = totalReps / valid.length;
    const weighted = valid.filter((s) => num(s.weight) > 0);
    const avgWeight = weighted.length
      ? weighted.reduce((sum, s) => sum + num(s.weight), 0) / weighted.length
      : 0;
    const peakSet = pickBestRepsSet(valid);
    const peakReps = peakSet ? num(peakSet.reps) : 0;
    const peakWeight = peakSet ? num(peakSet.weight) : 0;

    const weightNote = (w: number) => (w > 0 ? ` (+${w % 1 === 0 ? w : w.toFixed(1)}kg)` : "");

    switch (metric) {
      case "average":
        return {
          value: average,
          label: `${average.toFixed(1)} reps${weightNote(avgWeight)}`,
          higherIsBetter,
        };
      case "peak":
        return { value: peakReps, label: `${peakReps} reps${weightNote(peakWeight)}`, higherIsBetter };
      case "total":
        return { value: totalReps, label: `${totalReps} reps${weightNote(avgWeight)}`, higherIsBetter };
      case "e1rm":
        return null; // not meaningful without weight as the primary variable
    }
  }

  if (branch === "time") {
    const valid = sets.filter((s) => num(s.duration) > 0);
    if (valid.length === 0) return null;
    const totalSec = valid.reduce((sum, s) => sum + num(s.duration), 0);
    const averageSec = totalSec / valid.length;
    const weighted = valid.filter((s) => num(s.weight) > 0);
    const avgWeight = weighted.length
      ? weighted.reduce((sum, s) => sum + num(s.weight), 0) / weighted.length
      : 0;
    const peakSet = pickBestTimeSet(valid, meta.timeGoal);
    const peakSec = peakSet ? num(peakSet.duration) : 0;
    const peakWeight = peakSet ? num(peakSet.weight) : 0;

    const weightNote = (w: number) => (w > 0 ? ` (+${w % 1 === 0 ? w : w.toFixed(1)}kg)` : "");

    switch (metric) {
      case "average":
        return {
          value: averageSec,
          label: `${formatClock(averageSec * 1000)}${weightNote(avgWeight)}`,
          higherIsBetter,
        };
      case "peak":
        return {
          value: peakSec,
          label: `${formatClock(peakSec * 1000)}${weightNote(peakWeight)}`,
          higherIsBetter,
        };
      case "total":
        return { value: totalSec, label: formatClock(totalSec * 1000), higherIsBetter };
      case "e1rm":
        return null;
    }
  }

  if (branch === "distance") {
    const valid = sets.filter((s) => num(s.distance) > 0);
    if (valid.length === 0) return null;
    const totalDist = valid.reduce((sum, s) => sum + num(s.distance), 0);
    const averageDist = totalDist / valid.length;
    const peakSet = pickBestDistanceSet(valid);
    const peakDist = peakSet ? num(peakSet.distance) : 0;
    const unit = meta.distanceUnit;

    switch (metric) {
      case "average":
        return { value: averageDist, label: `${averageDist.toFixed(2)} ${unit}`, higherIsBetter };
      case "peak":
        return { value: peakDist, label: `${peakDist.toFixed(2)} ${unit}`, higherIsBetter };
      case "total":
        return { value: totalDist, label: `${totalDist.toFixed(2)} ${unit}`, higherIsBetter };
      case "e1rm":
        return null;
    }
  }

  return null;
}
