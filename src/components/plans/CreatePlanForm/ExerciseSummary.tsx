import { Icon } from "../../shared";
import { Exercise } from "../../../types";
import { EXERCISE_NAME_ERROR } from "./buildPlan";
import { describeExercise } from "./describeExercise";
import { useUnitPrefs } from "../../../utils/unitPrefs";

interface ExerciseSummaryProps {
  exercise: Exercise;
  number: number;
  invalid: boolean;
  onExpand: () => void;
}

/** A collapsed exercise: number, name and how it is measured. Tapping it opens the card. */
export function ExerciseSummary({ exercise, number, invalid, onExpand }: ExerciseSummaryProps) {
  const { distance } = useUnitPrefs();
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
          <span className="exerciseError"><Icon name="warning" />{EXERCISE_NAME_ERROR}</span>
        ) : (
          <span className="exerciseSummaryMeta">{describeExercise(exercise, distance)}</span>
        )}
      </span>
      <Icon name="chevron-down" className="exerciseSummaryChevron" />
    </button>
  );
}

export default ExerciseSummary;
