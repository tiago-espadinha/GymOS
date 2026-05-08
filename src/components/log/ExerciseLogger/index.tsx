import { ReactNode, useEffect, useRef, useState } from "react";
import { PrimaryButton } from "../../shared";
import { ExerciseLog, Set } from "../../../types";
import { getExerciseMeta } from "../../../utils/metrics";
import { isLoggedSet } from "../../../utils/activeSession";
import { restTimerId } from "../../../utils/restTimers";
import { NO_VALUES, formatSet, lastTimeLabel } from "../../../utils/sessionList";
import { SetDraft, addPendingSet, currentSetIndex, logDraft, seedDraft } from "../../../utils/setModel";
import { clearTimer, readRunningTimer } from "../../../hooks/useTimer";
import RestBlock from "../RestBlock";
import SetsTable from "../SetsTable";
import SetSteppers from "../SetSteppers";
import TimedSets from "./TimedSets";
import "./ExerciseLogger.css";

interface ExerciseLoggerProps {
  exercise: ExerciseLog;
  onChange: (exercise: ExerciseLog) => void;
  /** This exercise's logged sets from the most recent saved session that has it. */
  history: Set[];
  /** e.g. "Back · exercise 2 of 7". */
  place: string;
  titleId: string;
  /** Navigation, hidden while a set is being edited. */
  footer: ReactNode;
}

export function ExerciseLogger({ exercise, onChange, history, place, titleId, footer }: ExerciseLoggerProps) {
  const meta = getExerciseMeta(exercise);
  const timed = meta.trackingType === "time";
  const rootRef = useRef<HTMLDivElement>(null);

  // The set whose rest is on screen; restored from storage so a reload keeps it.
  const [rest, setRest] = useState<{ setId: string; fresh: boolean } | null>(() => {
    const set = exercise.sets.find((s) => readRunningTimer(restTimerId(s.id), Date.now()));
    return set ? { setId: set.id, fresh: false } : null;
  });
  // Unsaved stepper values; lost on reload by design.
  const [draft, setDraft] = useState<SetDraft>(() => seedDraft(exercise, history));
  const [editing, setEditing] = useState<{ index: number; draft: SetDraft } | null>(null);

  const index = currentSetIndex(exercise);
  const total = Math.max(exercise.sets.length, index + 1);
  const format = (s: Set) => formatSet(s, exercise) || NO_VALUES;
  const draftSet = (d: SetDraft): Set => ({ id: "", ...d });

  // Only one rest at a time: end the previous one so it cannot linger on the strip.
  const startRest = (setId: string) => {
    if (rest) clearTimer(restTimerId(rest.setId));
    setRest({ setId, fresh: true });
  };

  // A rest after a timed set is saved on that set; the seconds are the rest actually taken.
  const endRest = (setId: string, restSeconds: number) => {
    if (timed) {
      onChange({
        ...exercise,
        sets: exercise.sets.map((s) => (s.id === setId ? { ...s, restTaken: String(restSeconds) } : s)),
      });
    }
    setRest(null);
  };

  const setDone = () => {
    const logged = logDraft(exercise, draft);
    onChange(logged.exercise);
    startRest(logged.setId);
  };

  const removeSet = (i: number) => {
    const id = exercise.sets[i].id;
    if (id === rest?.setId) {
      clearTimer(restTimerId(id));
      setRest(null);
    }
    onChange({ ...exercise, sets: exercise.sets.filter((_, j) => j !== i) });
  };

  const saveEdit = () => {
    if (!editing) return;
    onChange({ ...exercise, sets: exercise.sets.map((s, i) => (i === editing.index ? { ...s, ...editing.draft } : s)) });
    setEditing(null);
  };

  const deleteEdit = () => {
    if (!editing) return;
    removeSet(editing.index);
    setEditing(null);
  };

  // Editing moves focus to the first field; leaving it returns focus to that
  // set's Edit button, or to the table once the set is deleted.
  const editedIndex = useRef<number | null>(null);
  const editingIndex = editing?.index ?? null;
  useEffect(() => {
    const root = rootRef.current;
    if (editingIndex !== null) root?.querySelector<HTMLInputElement>(".setSteppers input")?.focus();
    else if (editedIndex.current !== null) {
      const edit = root?.querySelector<HTMLElement>(`[aria-label="Edit set ${editedIndex.current + 1}"]`);
      (edit ?? root?.querySelector<HTMLElement>(".setsTable"))?.focus();
    }
    editedIndex.current = editingIndex;
  }, [editingIndex]);

  const kicker = editing
    ? `Edit set ${editing.index + 1}`
    : rest
      ? `Next · Set ${index + 1} of ${total}`
      : `Set ${index + 1} of ${total}`;
  const lastTime = !editing && !rest && lastTimeLabel(exercise, history);

  return (
    <div className="exerciseLogger" ref={rootRef}>
      {rest && (
        <RestBlock
          key={rest.setId}
          setId={rest.setId}
          setNumber={exercise.sets.findIndex((s) => s.id === rest.setId) + 1}
          category={meta.category}
          autoStart={rest.fresh}
          onSkip={(seconds) => endRest(rest.setId, seconds)}
        />
      )}

      <div className={`exerciseLoggerKicker${rest ? " exerciseLoggerKicker--next" : ""}`}>
        <span className="exerciseLoggerSet">{kicker}</span>
        {!rest && <span>{place}</span>}
      </div>
      <div className="exerciseLoggerHeading">
        <h1 id={titleId} className={`exerciseLoggerTitle${rest ? " exerciseLoggerTitle--resting" : ""}`} tabIndex={-1}>
          {exercise.name}
        </h1>
        {lastTime && <span className="exerciseLoggerLastTime">{lastTime}</span>}
      </div>

      {timed ? (
        <TimedSets exercise={exercise} onChange={onChange} resting={Boolean(rest)} onRest={startRest} onRemove={removeSet} />
      ) : (
        <>
          {!rest && (
            <SetsTable
              sets={exercise.sets}
              currentIndex={index}
              draftLabel={format(draftSet(draft))}
              editing={editing && { index: editing.index, label: format(draftSet(editing.draft)) }}
              format={format}
              onEdit={(i) => setEditing({ index: i, draft: { weight: exercise.sets[i].weight, reps: exercise.sets[i].reps } })}
              onRemove={removeSet}
            />
          )}
          {!rest && !editing && (
            <button type="button" className="exerciseLoggerAdd" onClick={() => onChange(addPendingSet(exercise))}>
              + Add set
            </button>
          )}
          <SetSteppers
            draft={editing?.draft ?? draft}
            onChange={(d) => (editing ? setEditing({ ...editing, draft: d }) : setDraft(d))}
            trackWeight={meta.trackWeight}
            outlined={Boolean(editing)}
          />
          {editing ? (
            <>
              <PrimaryButton onClick={saveEdit} disabled={!isLoggedSet(draftSet(editing.draft))}>
                Save set {editing.index + 1}
              </PrimaryButton>
              <div className="exerciseLoggerEditActions">
                <button type="button" className="exerciseLoggerDelete" onClick={deleteEdit}>
                  Delete set {editing.index + 1}
                </button>
                <button type="button" className="exerciseLoggerCancel" onClick={() => setEditing(null)}>
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <PrimaryButton onClick={setDone} disabled={!isLoggedSet(draftSet(draft))}>
              Set done
            </PrimaryButton>
          )}
        </>
      )}

      {!editing && footer}
    </div>
  );
}

export default ExerciseLogger;
