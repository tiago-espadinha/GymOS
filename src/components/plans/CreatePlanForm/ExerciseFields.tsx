import { useId } from "react";
import { SegmentedControl, Select, WarningIcon } from "../../shared";
import { MUSCLE_GROUPS } from "../../../constants/muscleGroups";
import { EXERCISE_CATEGORIES, CATEGORY_LABELS } from "../../../constants/exerciseTypes";
import { getExerciseMeta } from "../../../utils/metrics";
import { Exercise, TrackingType } from "../../../types";
import { EXERCISE_NAME_ERROR } from "./buildPlan";
import { ExerciseTracking } from "./ExerciseTracking";
import { withCategory } from "./withCategory";

interface ExerciseFieldsProps {
  exercise: Exercise;
  number: number;
  invalid: boolean;
  onChange: (exercise: Exercise) => void;
  onRemove: () => void;
}

const TRACKING_OPTIONS: { value: TrackingType; label: string }[] = [
  { value: "reps", label: "Reps" },
  { value: "time", label: "Time" },
];
const CATEGORY_OPTIONS = EXERCISE_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }));

/** The expanded exercise card. Only one is open at a time; the rest are ExerciseSummary rows. */
export function ExerciseFields({ exercise, number, invalid, onChange, onRemove }: ExerciseFieldsProps) {
  const errorId = useId();
  const meta = getExerciseMeta(exercise);
  const set = (changes: Partial<Exercise>) => onChange({ ...exercise, ...changes });

  return (
    <div className={`exerciseCard${invalid ? " exerciseCard--error" : ""}`}>
      <div className="exerciseCardHead">
        <span className="exerciseNumber" aria-hidden="true">{number}</span>
        <input
          className="exerciseNameInput"
          aria-label={`Exercise ${number} name`}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? errorId : undefined}
          data-exercise-name={exercise.id}
          value={exercise.name}
          placeholder="Exercise name"
          onChange={(e) => set({ name: e.target.value })}
        />
      </div>
      {invalid && <p id={errorId} className="exerciseError exerciseCardError"><WarningIcon />{EXERCISE_NAME_ERROR}</p>}

      <div className="exerciseGroup">
        <span className="exerciseGroupLabel" aria-hidden="true">Category</span>
        <SegmentedControl label="Category" options={CATEGORY_OPTIONS} value={meta.category}
          onChange={(c) => onChange(withCategory(exercise, c))} />
      </div>

      <div className="exercisePair">
        <Select label="Muscle group" value={exercise.muscleGroup} options={MUSCLE_GROUPS}
          onChange={(g) => set({ muscleGroup: g })} />
        <div className="exerciseGroup">
          <span className="exerciseGroupLabel" aria-hidden="true">Measured in</span>
          <SegmentedControl label="Measured in" tone="accent" options={TRACKING_OPTIONS} value={meta.trackingType}
            onChange={(t) => set({ trackingType: t })} />
        </div>
      </div>

      <ExerciseTracking meta={meta} set={set} />

      <button type="button" className="exerciseRemove" aria-label={`Remove exercise ${number}`} onClick={onRemove}>
        Remove exercise
      </button>
    </div>
  );
}

export default ExerciseFields;
