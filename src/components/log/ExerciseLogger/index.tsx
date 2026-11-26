import { ReactNode, useEffect, useRef, useState } from "react";
import { CheckIcon, PrimaryButton } from "../../shared";
import { ExerciseLog, Set } from "../../../types";
import { getExerciseMeta } from "../../../utils/metrics";
import { isLoggedSet } from "../../../utils/activeSession";
import { restTimerId } from "../../../utils/restTimers";
import { NO_VALUES, currentSetNumber, formatSet, lastTimeLabel } from "../../../utils/sessionList";
import { SetDraft, currentSetIndex, logDraft, seedDraft } from "../../../utils/setModel";
import { clearTimer, formatClock, readElapsedMs, readRunningTimer } from "../../../hooks/useTimer";
import RestBlock from "../RestBlock";
import IdleRest from "../RestBlock/IdleRest";
import SetsTable from "../SetsTable";
import SetSteppers from "../SetSteppers";
import EditSetPanel from "./EditSetPanel";
import TimedSets from "./TimedSets";
import "./ExerciseLogger.css";
import { useUnitPrefs } from "../../../utils/unitPrefs";
import { setFromDisplay, setToDisplay, storedWeight } from "../../../utils/units";

interface ExerciseLoggerProps {
  exercise: ExerciseLog;
  onChange: (exercise: ExerciseLog) => void;
  /** This exercise's logged sets from the most recent saved session that has it. */
  history: Set[];
  titleId: string;
  /** Navigation on top, given the set count ("Set 2 of 4", "Edit set 1") and whether a rest is on. */
  header: (setLabel: string, resting: boolean) => ReactNode;
  /** Navigation at the bottom, hidden while a set is being edited. */
  footer: ReactNode;
}

export function ExerciseLogger({ exercise, onChange, history, titleId, header, footer }: ExerciseLoggerProps) {
  const meta = getExerciseMeta(exercise);
  const units = useUnitPrefs();
  const timed = meta.trackingType === "time";
  const rootRef = useRef<HTMLDivElement>(null);

  // The set whose rest is on screen; restored from storage so a reload keeps it.
  const [rest, setRest] = useState<{ setId: string; fresh: boolean } | null>(() => {
    const set = exercise.sets.find((s) => readRunningTimer(restTimerId(s.id), Date.now()));
    return set ? { setId: set.id, fresh: false } : null;
  });
  // Unsaved stepper values; lost on reload by design.
  const [draft, setDraft] = useState<SetDraft>(() => seedDraft(exercise, history, units.weight));
  // A logged set being edited, with its values as changed so far in the chosen units.
  const [editing, setEditing] = useState<{ index: number; draft: Set } | null>(null);

  const index = currentSetIndex(exercise);
  const { number, total } = currentSetNumber(exercise);
  const format = (s: Set) => {
    const values = formatSet(s, exercise, units);
    const rest = timed && s.restTaken ? `rest ${formatClock(Number(s.restTaken) * 1000)}` : "";
    return [values, rest].filter(Boolean).join(" · ") || NO_VALUES;
  };
  // The steppers show the chosen unit; the row and the logged check read it back as stored kg.
  const draftSet = (d: SetDraft): Set => ({ id: "", weight: storedWeight(d.weight, units.weight), reps: d.reps });

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

  // "Start hold now" during a chained rest: the rest so far counts as taken.
  const endRestNow = () => {
    if (!rest) return;
    const id = restTimerId(rest.setId);
    const seconds = Math.round(readElapsedMs(id, Date.now()) / 1000);
    clearTimer(id);
    endRest(rest.setId, seconds);
  };

  // Set done and End rest each vanish when pressed, so the other one takes focus;
  // a timed exercise has no Set done, so its title does.
  const handOffFocus = useRef(false);
  useEffect(() => {
    if (!handOffFocus.current) return;
    handOffFocus.current = false;
    const next = rest ? ".timerBlock--rest .timerBlockButton--wide" : "[data-set-done]";
    (rootRef.current?.querySelector<HTMLElement>(next) ?? document.getElementById(titleId))?.focus();
  }, [rest, titleId]);

  const setDone = () => {
    handOffFocus.current = true;
    const logged = logDraft(exercise, draft, units.weight);
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

  // The edited set in storage units; untouched fields keep their stored values.
  const editedSet = editing && setFromDisplay(editing.draft, exercise.sets[editing.index], units, meta.distanceUnit);

  const saveEdit = () => {
    if (!editing || !editedSet) return;
    onChange({ ...exercise, sets: exercise.sets.map((s, i) => (i === editing.index ? { ...s, ...editedSet } : s)) });
    setEditing(null);
  };

  const deleteEdit = () => {
    if (!editing) return;
    removeSet(editing.index);
    // Another set now has this number; focus goes to the table instead.
    editedIndex.current = -1;
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
      // With a rest running the table steps aside, so the title takes focus.
      (edit ?? root?.querySelector<HTMLElement>(".setsTable") ?? document.getElementById(titleId))?.focus();
    }
    editedIndex.current = editingIndex;
  }, [editingIndex, titleId]);

  const kicker = editing
    ? `Edit set ${editing.index + 1}`
    : rest
      ? `Next · Set ${number} of ${total}`
      : `Set ${number} of ${total}`;
  const startEdit = (i: number) => setEditing({ index: i, draft: setToDisplay(exercise.sets[i], units, meta.distanceUnit) });
  const editingRow = editing && editedSet && { index: editing.index, label: format(editedSet) };
  // A timed set needs a time; a distance alone is not a set.
  const canSave = editing !== null && (timed ? Number(editing.draft.duration) > 0 : isLoggedSet(editing.draft));

  const lastTime = !editing && !rest && lastTimeLabel(exercise, history, units);
  const restIndex = rest ? exercise.sets.findIndex((s) => s.id === rest.setId) : -1;
  // A hold's block sits above its title, so a timed exercise places the heading itself.
  const headingInHold = timed && !rest && !editing;

  const heading = (
    <div className="exerciseLoggerHeading">
      <h1 id={titleId} className={`exerciseLoggerTitle${rest ? " exerciseLoggerTitle--resting" : ""}`} tabIndex={-1}>
        {exercise.name}
      </h1>
      {lastTime && <span className="exerciseLoggerLastTime">{lastTime}</span>}
    </div>
  );

  return (
    <div className={`exerciseLogger${rest && !editing ? " exerciseLogger--resting" : ""}`} ref={rootRef}>
      {/* Above a hold the block already names the set. */}
      {header(headingInHold ? "" : kicker, Boolean(rest) && !editing)}
      {!timed && !rest && <IdleRest setNumber={number} category={meta.category} />}
      {rest && (
        <RestBlock
          key={rest.setId}
          setId={rest.setId}
          setNumber={restIndex + 1}
          meta={timed ? `${exercise.name} · set ${number} next` : undefined}
          timed={timed}
          category={meta.category}
          autoStart={rest.fresh}
          onEnd={(seconds) => {
            handOffFocus.current = true;
            endRest(rest.setId, seconds);
          }}
        />
      )}

      {timed && rest && restIndex >= 0 && (
        <p className="exerciseLoggerLogged">
          <CheckIcon />
          Set {restIndex + 1} logged · {formatClock(Number(exercise.sets[restIndex].duration) * 1000)}
        </p>
      )}
      {!headingInHold && heading}

      {timed ? (
        <TimedSets
          exercise={exercise}
          onChange={onChange}
          resting={Boolean(rest)}
          heading={headingInHold && heading}
          editing={editingRow}
          format={format}
          onRest={startRest}
          onEndRest={endRestNow}
          onEdit={startEdit}
          onRemove={removeSet}
        />
      ) : (
        <>
          {!rest && (
            <SetsTable
              sets={exercise.sets}
              currentIndex={index}
              draftLabel={format(draftSet(draft))}
              editing={editingRow}
              format={format}
              onEdit={startEdit}
              onRemove={removeSet}
            />
          )}
          {!editing && (
            <>
              <SetSteppers draft={draft} onChange={setDraft} trackWeight={meta.trackWeight} />
              {/* Only End rest moves on from a rest; the steppers stay to set up the next set. */}
              {!rest && (
                <PrimaryButton onClick={setDone} disabled={!isLoggedSet(draftSet(draft))} data-set-done>
                  Set done
                </PrimaryButton>
              )}
            </>
          )}
        </>
      )}

      {editing && (
        <EditSetPanel
          set={editing.draft}
          index={editing.index}
          timed={timed}
          trackWeight={meta.trackWeight}
          distanceUnit={meta.trackDistance ? units.distance : undefined}
          canSave={canSave}
          onChange={(d) => setEditing({ ...editing, draft: d })}
          onSave={saveEdit}
          onDelete={deleteEdit}
          onCancel={() => setEditing(null)}
        />
      )}

      {!editing && footer}
    </div>
  );
}

export default ExerciseLogger;
