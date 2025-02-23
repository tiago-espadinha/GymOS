export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
}

export interface Set {
  id: string;
  weight: string;
  reps: string;
}

export interface ExerciseLog extends Exercise {
  sets: Set[];
}

export interface TrainingPlan {
  id: string;
  name: string;
  desc: string;
  exercises: Exercise[];
}

export interface WorkoutSession {
  id: string;
  planId: string;
  planName: string;
  date: string;
  notes: string;
  exercises: ExerciseLog[];
}
