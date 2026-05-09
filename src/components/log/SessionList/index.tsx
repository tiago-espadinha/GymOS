import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { ListRow, SetTicks } from "../../shared";
import { ExerciseLog, WorkoutSession } from "../../../types";
import { currentExerciseId, exerciseProgress, rowSubtitle } from "../../../utils/sessionList";
import { lastTimeSets } from "../../../utils/setModel";
import ExerciseScreen from "../ExerciseScreen";
import RestStrip from "../RestStrip";
import "./SessionList.css";

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
}

const itemId = (exerciseId: string) => `sessionItem-${exerciseId}`;
const titleId = (exerciseId: string) => `exerciseTitle-${exerciseId}`;

// The list of exercises, or one exercise as a full screen.
export function SessionList({ planName, exercises, onChangeExercise, sessions, editingId, header, actions }: SessionListProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const names = exercises.map((ex) => ex.name).join("\n");
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
      <RestStrip exercises={exercises} openExerciseId={openId} onOpen={setOpenId} />
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
                    subtitle={rowSubtitle(ex, history.get(ex.name) ?? [])}
                    current={ex.id === currentId}
                    onClick={() => setOpenId(ex.id)}
                    trailing={<SetTicks total={total} done={done} />}
                  />
                </li>
              );
            })}
          </ul>
          {actions}
        </>
      )}
      {exercises.map((ex, i) => (
        <ExerciseScreen
          key={ex.id}
          exercise={ex}
          position={i + 1}
          count={exercises.length}
          planName={planName}
          next={exercises[i + 1]}
          history={history.get(ex.name) ?? []}
          hidden={ex.id !== openId}
          titleId={titleId(ex.id)}
          onChange={onChangeExercise}
          onAllExercises={() => setOpenId(null)}
          onNext={() => setOpenId(exercises[i + 1].id)}
        />
      ))}
    </div>
  );
}

export default SessionList;
