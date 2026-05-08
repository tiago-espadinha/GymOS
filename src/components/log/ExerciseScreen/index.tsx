import { ExerciseLog } from "../../../types";
import { currentSetNumber } from "../../../utils/sessionList";
import ExerciseLogger from "../ExerciseLogger";
import "./ExerciseScreen.css";

interface ExerciseScreenProps {
  exercise: ExerciseLog;
  /** The exercise's place in the session, from 1. */
  position: number;
  count: number;
  planName: string;
  /** The exercise after this one; none on the last. */
  next?: ExerciseLog;
  /** Hidden screens stay mounted so a running rest or hold keeps its timer. */
  hidden: boolean;
  titleId: string;
  onChange: (exercise: ExerciseLog) => void;
  onAllExercises: () => void;
  onNext: () => void;
}

export function ExerciseScreen({
  exercise,
  position,
  count,
  planName,
  next,
  hidden,
  titleId,
  onChange,
  onAllExercises,
  onNext,
}: ExerciseScreenProps) {
  const set = currentSetNumber(exercise);

  return (
    <section className="exerciseScreen" hidden={hidden} aria-labelledby={titleId}>
      <div className="exerciseScreenKicker">
        {set.total > 0 && (
          <span className="exerciseScreenSet">
            Set {set.number} of {set.total}
          </span>
        )}
        <span className="exerciseScreenPlace">
          {planName} · exercise {position} of {count}
        </span>
      </div>
      <h1 id={titleId} className="exerciseScreenTitle" tabIndex={-1}>
        {exercise.name}
      </h1>

      <ExerciseLogger exercise={exercise} onChange={onChange} />

      <div className="exerciseScreenNav">
        <button type="button" className="exerciseScreenBack" onClick={onAllExercises}>
          All exercises
        </button>
        {next && (
          <button
            type="button"
            className="exerciseScreenNext"
            aria-label={`Next exercise: ${next.name}`}
            onClick={onNext}
          >
            {next.name} <span aria-hidden="true">→</span>
          </button>
        )}
      </div>
    </section>
  );
}

export default ExerciseScreen;
