import {
  DEFAULT_TRACKING_TYPE,
  DEFAULT_TRACK_WEIGHT,
  DEFAULT_TRACK_DISTANCE,
} from "../../../constants/exerciseTypes";
import { Exercise, ExerciseCategory } from "../../../types";

export function withCategory(exercise: Exercise, category: ExerciseCategory): Exercise {
  // A tap on the already selected chip must not reset the tracking choices.
  if ((exercise.category ?? "strength") === category) return exercise;
  const next: Exercise = {
    ...exercise,
    category,
    trackingType: DEFAULT_TRACKING_TYPE[category],
    trackWeight: DEFAULT_TRACK_WEIGHT[category],
    trackDistance: DEFAULT_TRACK_DISTANCE[category],
  };
  // Move the muscle group off the default placeholder only while it is untouched.
  if (category === "cardio" && exercise.muscleGroup === "Chest") next.muscleGroup = "Cardio";
  if (category !== "cardio" && exercise.muscleGroup === "Cardio") next.muscleGroup = "Chest";
  return next;
}
