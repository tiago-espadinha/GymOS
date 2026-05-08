import { CATEGORY_LABELS } from "../../../constants/exerciseTypes";
import { getExerciseMeta } from "../../../utils/metrics";
import { Exercise } from "../../../types";

/** How a set is measured, using the same defaults the Log screens apply. */
function measure(exercise: Exercise): string {
  const meta = getExerciseMeta(exercise);
  if (meta.trackingType === "reps") return meta.trackWeight ? "weight × reps" : "reps";
  return meta.trackDistance ? `time + ${meta.distanceUnit}` : "time";
}

/** The subtitle of a collapsed exercise: "Strength · Legs · weight × reps". */
export function describeExercise(exercise: Exercise): string {
  return [CATEGORY_LABELS[getExerciseMeta(exercise).category], exercise.muscleGroup, measure(exercise)].join(" · ");
}
