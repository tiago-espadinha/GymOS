// Broad category of exercise. Drives icon, default tracking type, and which
// timer presets are suggested (a plank and a 5k run both use a "time" based
// tracking type, but want very different preset durations).
export type ExerciseCategory = "strength" | "calisthenics" | "cardio";

// How a set is actually measured. "reps" = weight/bodyweight x reps (classic
// strength/calisthenics logging). "time" = a duration (isometric holds like
// planks, or cardio like running/rowing), optionally paired with a distance.
export type TrackingType = "reps" | "time";

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  category?: ExerciseCategory; // defaults to "strength" when absent (legacy data)
  trackingType?: TrackingType; // defaults to "reps" when absent (legacy data)
  trackWeight?: boolean; // show a weight input alongside reps (e.g. weighted dips)
  trackDistance?: boolean; // show a distance input alongside duration (e.g. running)
  distanceUnit?: "km" | "mi";
  // Only meaningful for time-tracked exercises without distance (isometric
  // holds, time-only cardio): whether a longer or shorter duration counts as
  // the better "peak" set, and which way the progress chart should color
  // improvement vs decline. Defaults to "longer" (e.g. a plank hold).
  timeGoal?: "longer" | "shorter";
}

export interface Set {
  id: string;
  weight: string;
  reps: string;
  duration?: string; // seconds, for time-tracked sets
  distance?: string; // distance covered, for distance-tracked sets
  restTaken?: string; // seconds of rest actually taken after this set (optional log)
  completed?: boolean;
}

export interface ExerciseLog extends Exercise {
  sets: Set[];
}

export interface TrainingPlan {
  id: string;
  name: string;
  desc: string;
  exercises: Exercise[];
  isArchived?: boolean;
}

export interface WorkoutSession {
  id: string;
  planId: string;
  planName: string;
  date: string;
  notes: string;
  exercises: ExerciseLog[];
}
