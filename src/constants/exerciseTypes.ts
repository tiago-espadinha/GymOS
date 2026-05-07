import { ExerciseCategory, TrackingType } from "../types";

export const EXERCISE_CATEGORIES: ExerciseCategory[] = [
  "strength",
  "calisthenics",
  "cardio",
];

export const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  strength: "Strength",
  calisthenics: "Calisthenics",
  cardio: "Cardio",
};

// Small glyphs used in badges/headers - keeps things monospace/console-like
// rather than pulling in an icon library.
export const CATEGORY_ICONS: Record<ExerciseCategory, string> = {
  strength: "\u25C6", // ◆
  calisthenics: "\u25C9", // ◉
  cardio: "\u2248", // ≈
};

export const CATEGORY_COLORS: Record<ExerciseCategory, string> = {
  strength: "#3b82f6",
  calisthenics: "#34d399",
  cardio: "#f87171",
};

// Sensible default tracking type per category - still overridable per exercise
// (e.g. a weighted plank hold is calisthenics + time, a farmer's carry is
// strength + time, sprints are cardio + reps-of-intervals, etc).
export const DEFAULT_TRACKING_TYPE: Record<ExerciseCategory, TrackingType> = {
  strength: "reps",
  calisthenics: "reps",
  cardio: "time",
};

export const DEFAULT_TRACK_WEIGHT: Record<ExerciseCategory, boolean> = {
  strength: true,
  calisthenics: false,
  cardio: false,
};

export const DEFAULT_TRACK_DISTANCE: Record<ExerciseCategory, boolean> = {
  strength: false,
  calisthenics: false,
  cardio: true,
};

export const TRACKING_TYPE_LABELS: Record<TrackingType, string> = {
  reps: "Reps",
  time: "Time",
};
