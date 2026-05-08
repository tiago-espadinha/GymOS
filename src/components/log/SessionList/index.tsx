import { useState } from "react";
import { flushSync } from "react-dom";
import { ListRow, SetTicks } from "../../shared";
import { ExerciseLog } from "../../../types";
import { currentExerciseId, exerciseProgress, lastValues } from "../../../utils/sessionList";
import ExerciseLogger from "../ExerciseLogger";
import RestStrip from "../RestStrip";
import "./SessionList.css";

interface SessionListProps {
  exercises: ExerciseLog[];
  onChangeExercise: (exercise: ExerciseLog) => void;
}

const itemId = (exerciseId: string) => `sessionItem-${exerciseId}`;

export function SessionList({ exercises, onChangeExercise }: SessionListProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const currentId = currentExerciseId(exercises);

  const openFromStrip = (exerciseId: string) => {
    flushSync(() => setOpenId(exerciseId));
    document.getElementById(itemId(exerciseId))?.scrollIntoView({ block: "start" });
  };

  return (
    <div className="sessionList">
      <RestStrip exercises={exercises} onOpen={openFromStrip} />
      <ul className="sessionListRows" role="list">
        {exercises.map((ex) => {
          const { done, total } = exerciseProgress(ex);
          const open = openId === ex.id;
          return (
            <li key={ex.id} id={itemId(ex.id)}>
              <ListRow
                title={ex.name}
                subtitle={lastValues(ex)}
                current={ex.id === currentId}
                expanded={open}
                onClick={() => setOpenId(open ? null : ex.id)}
                trailing={<SetTicks total={total} done={done} />}
              />
              {/* Kept mounted while closed so a running rest keeps its timer and cue. */}
              <div hidden={!open} className="sessionListLogger">
                <ExerciseLogger exercise={ex} onChange={onChangeExercise} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default SessionList;
