import { CATEGORY_LABELS } from "../../../constants/exerciseTypes";
import { getExerciseMeta } from "../../../utils/metrics";
import { Exercise } from "../../../types";
import type { DistanceUnit } from "../../../utils/unitPrefs";

/** How a set is measured, using the same defaults the Log screens apply. */
function measure(exercise: Exercise, distance: DistanceUnit): string {
  const meta = getExerciseMeta(exercise);
  if (meta.trackingType === "reps") return meta.trackWeight ? "weight × reps" : "reps";
  return meta.trackDistance ? `time + ${distance}` : "time";
}

/** The subtitle of a collapsed exercise: "Strength · Legs · weight × reps", distance in the unit chosen in Settings. */
export function describeExercise(exercise: Exercise, distance: DistanceUnit = "km"): string {
  return [CATEGORY_LABELS[getExerciseMeta(exercise).category], exercise.muscleGroup, measure(exercise, distance)].join(" · ");
}
