import { WarningIcon } from "../../shared";
import { Exercise } from "../../../types";
import { EXERCISE_NAME_ERROR } from "./buildPlan";
import { describeExercise } from "./describeExercise";

interface ExerciseSummaryProps {
  exercise: Exercise;
  number: number;
  invalid: boolean;
  onExpand: () => void;
}

/** A collapsed exercise: number, name and how it is measured. Tapping it opens the card. */
export function ExerciseSummary({ exercise, number, invalid, onExpand }: ExerciseSummaryProps) {
  const name = exercise.name.trim();
  return (
    <button
      type="button"
      className={`exerciseSummary${invalid ? " exerciseSummary--error" : ""}`}
      aria-expanded={false}
      data-exercise-header={exercise.id}
      onClick={onExpand}
    >
      <span className="exerciseNumber" aria-hidden="true">{number}</span>
      <span className="exerciseSummaryText">
        <span className={`exerciseSummaryName${name ? "" : " exerciseSummaryName--empty"}`}>
          {name || `Exercise ${number}`}
        </span>
        {invalid ? (
          <span className="exerciseError"><WarningIcon />{EXERCISE_NAME_ERROR}</span>
        ) : (
          <span className="exerciseSummaryMeta">{describeExercise(exercise)}</span>
        )}
      </span>
      <svg className="exerciseSummaryChevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>
  );
}

export default ExerciseSummary;
