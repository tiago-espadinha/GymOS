import { PillButton } from "../../shared";
import { ExerciseLog, Set } from "../../../types";
import { exerciseFinishId } from "../../../utils/sessionList";
import ExerciseLogger from "../ExerciseLogger";
import "./ExerciseScreen.css";

export interface FinishAction {
  disabled: boolean;
  allDone: boolean;
  onClick: () => void;
}

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
  /** The session's Finish, shown beside the navigation at wide widths. */
  finish: FinishAction;
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
  finish,
}: ExerciseScreenProps) {
  const nextButton = next && (
    <button
      type="button"
      className="exerciseScreenNext"
      aria-label={`Next exercise: ${next.name}`}
      onClick={onNext}
    >
      {next.name} <span aria-hidden="true">→</span>
    </button>
  );

  return (
    <section className="exerciseScreen" hidden={hidden} aria-labelledby={titleId}>
      <ExerciseLogger
        exercise={exercise}
        onChange={onChange}
        history={history}
        place={`${planName} · exercise ${position} of ${count}`}
        titleId={titleId}
        header={
          <div className="exerciseScreenTop">
            <button type="button" className="exerciseScreenBack" onClick={onAllExercises}>
              <span aria-hidden="true">← </span>All exercises
            </button>
            {nextButton}
            <PillButton
              id={exerciseFinishId(exercise.id)}
              variant={finish.allDone ? "white" : "outline-white"}
              onClick={finish.onClick}
              disabled={finish.disabled}
              aria-label="Finish session"
            >
              Finish
            </PillButton>
          </div>
        }
        footer={
          <div className="exerciseScreenNav">
            <button type="button" className="exerciseScreenBack" onClick={onAllExercises}>
              All exercises
            </button>
            {nextButton}
          </div>
        }
      />
    </section>
  );
}

export default ExerciseScreen;
