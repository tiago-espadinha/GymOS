import { ExerciseLog, Set } from "../../../types";
import { exerciseFinishId, exerciseProgress } from "../../../utils/sessionList";
import { Icon } from "../../shared";
import ExerciseLogger from "../ExerciseLogger";
import SavedSets from "../SavedSets";
import "./ExerciseScreen.css";

export interface FinishAction {
  disabled: boolean;
  allDone: boolean;
  onClick: () => void;
}

interface ExerciseScreenProps {
  exercise: ExerciseLog;
  /** Every exercise in the session, in order, for the segments. */
  exercises: ExerciseLog[];
  /** The exercise after this one; none on the last. */
  next?: ExerciseLog;
  planName: string;
  /** A saved session being edited: its sets are corrected, not performed. */
  saved: boolean;
  /** This exercise's sets from last time. */
  history: Set[];
  /** Hidden screens stay mounted so a running rest or hold keeps its timer. */
  hidden: boolean;
  titleId: string;
  onChange: (exercise: ExerciseLog) => void;
  onAllExercises: () => void;
  onOpen: (exerciseId: string) => void;
  /** The session's Finish, on the last exercise's bottom card. */
  finish: FinishAction;
}

export function ExerciseScreen({
  exercise,
  exercises,
  next,
  planName,
  saved,
  history,
  hidden,
  titleId,
  onChange,
  onAllExercises,
  onOpen,
  finish,
}: ExerciseScreenProps) {
  const segments = (
    <nav className="exerciseSegments" aria-label="Exercises">
      {exercises.map((ex, i) => {
        const { done, total } = exerciseProgress(ex);
        const current = ex.id === exercise.id;
        const finished = done > 0 && done === total;
        return (
          <button
            key={ex.id}
            type="button"
            className={`exerciseSegment${current ? " exerciseSegment--current" : finished ? " exerciseSegment--done" : ""}`}
            aria-label={`${ex.name}, exercise ${i + 1} of ${exercises.length}${finished ? ", done" : ""}`}
            aria-current={current ? "step" : undefined}
            onClick={() => onOpen(ex.id)}
          />
        );
      })}
    </nav>
  );

  const card = next ? (
    <button type="button" className="exerciseNextCard" onClick={() => onOpen(next.id)}>
      <span className="exerciseNextCardText">
        <span className="exerciseNextCardLabel">Next</span>{" "}
        <span className="exerciseNextCardName">{next.name}</span>
      </span>
      <Icon name="arrow-right" size="lg" />
    </button>
  ) : (
    <button
      type="button"
      id={exerciseFinishId(exercise.id)}
      className={`exerciseNextCard exerciseNextCard--finish${finish.allDone ? " exerciseNextCard--allDone" : ""}`}
      onClick={finish.onClick}
      disabled={finish.disabled}
    >
      <span className="exerciseNextCardText">
        <span className="exerciseNextCardName">
          Finish<span className="visuallyHidden"> session</span>
        </span>
      </span>
      <Icon name="arrow-right" size="lg" />
    </button>
  );

  const header = (setLabel: string, resting = false) => (
    <div>
      <div className="exerciseScreenTop">
        <button type="button" className="exerciseScreenBack" onClick={onAllExercises}>
          <Icon name="chevron-left" />
          All exercises
        </button>
        <p className="exerciseScreenPlace">
          <span className="exerciseScreenPlan">{planName}</span>
          <span className={`exerciseScreenSet${resting ? " exerciseScreenSet--next" : ""}`}>{setLabel}</span>
        </p>
      </div>
      {segments}
    </div>
  );
  const shared = { exercise, onChange, titleId, header, footer: card };

  return (
    <section className={`exerciseScreen${saved ? " exerciseScreen--saved" : ""}`} hidden={hidden} aria-labelledby={titleId}>
      {saved ? <SavedSets {...shared} /> : <ExerciseLogger {...shared} history={history} />}
    </section>
  );
}

export default ExerciseScreen;
