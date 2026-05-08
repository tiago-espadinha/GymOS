import { ExerciseLog, Set } from "../../../types";
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
  /** This exercise's sets from last time. */
  history: Set[];
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
  history,
  hidden,
  titleId,
  onChange,
  onAllExercises,
  onNext,
}: ExerciseScreenProps) {
  return (
    <section className="exerciseScreen" hidden={hidden} aria-labelledby={titleId}>
      <ExerciseLogger
        exercise={exercise}
        onChange={onChange}
        history={history}
        place={`${planName} · exercise ${position} of ${count}`}
        titleId={titleId}
        footer={
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
        }
      />
    </section>
  );
}

export default ExerciseScreen;
