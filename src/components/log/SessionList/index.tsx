import { ReactNode, useEffect, useMemo, useRef } from "react";
import { ListRow, SetTicks } from "../../shared";
import { ExerciseLog, WorkoutSession } from "../../../types";
import { currentExerciseId, exerciseProgress, rowSubtitle } from "../../../utils/sessionList";
import { lastTimeSets } from "../../../utils/setModel";
import ExerciseScreen, { type FinishAction } from "../ExerciseScreen";
import RestStrip from "../RestStrip";
import "./SessionList.css";
import { useUnitPrefs } from "../../../utils/unitPrefs";

interface SessionListProps {
  planName: string;
  exercises: ExerciseLog[];
  onChangeExercise: (exercise: ExerciseLog) => void;
  /** Saved sessions, for each exercise's sets from last time. */
  sessions: WorkoutSession[];
  /** The saved session being edited, left out of that history. */
  editingId?: string;
  /** Shown above the rows, with the list only. */
  header: ReactNode;
  /** Shown below the rows, with the list only. */
  actions: ReactNode;
  /** Finish on the last exercise screen's bottom card; the list's own is in the header. */
  finish: FinishAction;
  /** The exercise shown as a full screen, or null for the list; kept by the parent across the Done screen. */
  openId: string | null;
  onOpen: (exerciseId: string | null) => void;
}

const itemId = (exerciseId: string) => `sessionItem-${exerciseId}`;
const titleId = (exerciseId: string) => `exerciseTitle-${exerciseId}`;

// The list of exercises, or one exercise as a full screen.
export function SessionList({ planName, exercises, onChangeExercise, sessions, editingId, header, actions, finish, openId, onOpen }: SessionListProps) {
  const names = exercises.map((ex) => ex.name).join("\n");
  const units = useUnitPrefs();
  // Keyed by name, which only changes with the plan, not on every logged set.
  const history = useMemo(
    () => new Map(names.split("\n").map((name) => [name, lastTimeSets(sessions, name, editingId)])),
    [names, sessions, editingId],
  );
  const currentId = currentExerciseId(exercises);

  // Opening an exercise moves focus to its name; going back returns it to that row.
  const lastOpenId = useRef<string | null>(null);
  useEffect(() => {
    if (openId) {
      window.scrollTo({ top: 0 });
      document.getElementById(titleId(openId))?.focus();
    } else if (lastOpenId.current) {
      document.getElementById(itemId(lastOpenId.current))?.querySelector("button")?.focus();
    }
    lastOpenId.current = openId;
  }, [openId]);

  return (
    <div className="sessionList">
      <RestStrip exercises={exercises} openExerciseId={openId} onOpen={onOpen} />
      {openId === null && (
        <>
          {header}
          <ul className="sessionListRows" role="list">
            {exercises.map((ex, i) => {
              const { done, total } = exerciseProgress(ex);
              return (
                <li key={ex.id} id={itemId(ex.id)}>
                  <ListRow
                    number={i + 1}
                    title={ex.name}
                    subtitle={rowSubtitle(ex, history.get(ex.name) ?? [], units)}
                    current={ex.id === currentId}
                    onClick={() => onOpen(ex.id)}
                    trailing={<SetTicks total={total} done={done} />}
                  />
                </li>
              );
            })}
          </ul>
          {actions}
        </>
      )}
      {exercises.map((ex, i) => {
        const next = exercises[i + 1];
        return (
          <ExerciseScreen
            key={ex.id}
            exercise={ex}
            exercises={exercises}
            planName={planName}
            saved={Boolean(editingId)}
            history={history.get(ex.name) ?? []}
            next={next}
            hidden={ex.id !== openId}
            titleId={titleId(ex.id)}
            onChange={onChangeExercise}
            onAllExercises={() => onOpen(null)}
            onOpen={onOpen}
            finish={finish}
          />
        );
      })}
    </div>
  );
}

export default SessionList;
