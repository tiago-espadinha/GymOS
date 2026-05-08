import { useId } from "react";
import { ChipGroup, Field, SegmentedControl } from "../../shared";
import { MUSCLE_GROUPS } from "../../../constants/muscleGroups";
import {
  EXERCISE_CATEGORIES,
  CATEGORY_LABELS,
  DEFAULT_TRACKING_TYPE,
} from "../../../constants/exerciseTypes";
import { Exercise, TrackingType } from "../../../types";
import { withCategory } from "./withCategory";

interface ExerciseFieldsProps {
  exercise: Exercise;
  index: number;
  canRemove: boolean;
  onChange: (exercise: Exercise) => void;
  onRemove: () => void;
}

const TRACKING_OPTIONS: { value: TrackingType; label: string }[] = [
  { value: "reps", label: "Reps" },
  { value: "time", label: "Time" },
];
const GOAL_OPTIONS: { value: "longer" | "shorter"; label: string }[] = [
  { value: "longer", label: "Longer is better" },
  { value: "shorter", label: "Shorter is better" },
];
const UNIT_OPTIONS: { value: "km" | "mi"; label: string }[] = [
  { value: "km", label: "km" },
  { value: "mi", label: "mi" },
];
const CATEGORY_OPTIONS = EXERCISE_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }));

export function ExerciseFields({ exercise, index, canRemove, onChange, onRemove }: ExerciseFieldsProps) {
  const muscleId = useId();
  const number = index + 1;
  const category = exercise.category || "strength";
  const trackingType = exercise.trackingType || DEFAULT_TRACKING_TYPE[category];
  const trackDistance = exercise.trackDistance ?? category === "cardio";
  const set = (changes: Partial<Exercise>) => onChange({ ...exercise, ...changes });

  return (
    <li className="createPlanFormExercise">
      <div className="createPlanFormExerciseHead">
        <h4 className="createPlanFormExerciseTitle">Exercise {number}</h4>
        {canRemove && (
          <button
            type="button"
            className="createPlanFormRemove"
            aria-label={`Remove exercise ${number}`}
            onClick={onRemove}
          >
            ×
          </button>
        )}
      </div>

      <Field
        label={`Exercise ${number} name`}
        value={exercise.name}
        onChange={(e) => set({ name: e.target.value })}
        placeholder="Exercise name"
      />

      <ChipGroup
        label={`Exercise ${number} category`}
        options={CATEGORY_OPTIONS}
        value={category}
        onChange={(c) => onChange(withCategory(exercise, c))}
      />

      <div className="createPlanFormSelectField">
        <label htmlFor={muscleId} className="createPlanFormLabel">
          Exercise {number} muscle group
        </label>
        <select
          id={muscleId}
          className="createPlanFormSelect"
          value={exercise.muscleGroup}
          onChange={(e) => set({ muscleGroup: e.target.value })}
        >
          {MUSCLE_GROUPS.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
      </div>

      <SegmentedControl
        label={`Exercise ${number} tracking`}
        options={TRACKING_OPTIONS}
        value={trackingType}
        onChange={(t) => set({ trackingType: t })}
      />

      {trackingType === "reps" && category !== "strength" && (
        <label className="createPlanFormCheckbox">
          <input
            type="checkbox"
            checked={!!exercise.trackWeight}
            onChange={() => set({ trackWeight: !exercise.trackWeight })}
          />
          Track added weight
        </label>
      )}

      {trackingType === "time" && category === "cardio" && (
        <label className="createPlanFormCheckbox">
          <input
            type="checkbox"
            checked={trackDistance}
            onChange={() => set({ trackDistance: !trackDistance })}
          />
          Track distance
        </label>
      )}

      {trackingType === "time" && trackDistance && (
        <SegmentedControl
          label={`Exercise ${number} distance unit`}
          tone="lime"
          options={UNIT_OPTIONS}
          value={exercise.distanceUnit ?? "km"}
          onChange={(u) => set({ distanceUnit: u })}
        />
      )}

      {trackingType === "time" && !trackDistance && (
        <SegmentedControl
          label={`Exercise ${number} better set`}
          options={GOAL_OPTIONS}
          value={exercise.timeGoal ?? "longer"}
          onChange={(g) => set({ timeGoal: g })}
        />
      )}
    </li>
  );
}

export default ExerciseFields;
