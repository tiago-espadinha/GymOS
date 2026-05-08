import { useState } from "react";
import { Badge, Button, NumericInput, PrimaryButton } from "../../shared";
import { MUSCLE_GROUP_COLORS } from "../../../constants/muscleGroups";
import { CATEGORY_ICONS, CATEGORY_COLORS } from "../../../constants/exerciseTypes";
import { generateId } from "../../../utils/id";
import { ExerciseLog, Set } from "../../../types";
import { getExerciseMeta, computeMetric } from "../../../utils/metrics";
import { isLoggedSet } from "../../../utils/activeSession";
import { restTimerId } from "../../../utils/restTimers";
import { clearTimer, readRunningTimer } from "../../../hooks/useTimer";
import SetRow from "../SetRow";
import TimedSetRow from "../TimedSetRow";
import RestBlock from "../RestBlock";
import TimedSetBlock from "../TimedSetBlock";
import { DEFAULT_PRESETS } from "../../../constants/timerPresets";
import "./ExerciseLogger.css";

interface ExerciseLoggerProps {
  exercise: ExerciseLog;
  onChange: (exercise: ExerciseLog) => void;
}

export function ExerciseLogger({ exercise, onChange }: ExerciseLoggerProps) {
  const meta = getExerciseMeta(exercise);
  const { category, trackingType, trackDistance } = meta;

  // The set whose rest is on screen; restored from storage so a reload keeps it.
  const [rest, setRest] = useState<{ setId: string; fresh: boolean } | null>(() => {
    const set = exercise.sets.find((s) => readRunningTimer(restTimerId(s.id), Date.now()));
    return set ? { setId: set.id, fresh: false } : null;
  });

  // Isometric holds and loaded carries chain into a rest before the next set;
  // steady-state cardio usually doesn't. The toggle lets the person override it.
  const [chainRest, setChainRest] = useState(category !== "cardio");

  const addSet = () => {
    const last = exercise.sets[exercise.sets.length - 1];
    // A timed set starts empty: a seeded duration would count as a hold done.
    const seed: Partial<Set> =
      trackingType === "time" ? {} : { weight: last?.weight || "", reps: last?.reps || "" };
    onChange({
      ...exercise,
      sets: [...exercise.sets, { id: generateId(), weight: "", reps: "", ...seed }],
    });
  };

  // The set being entered is always the last one.
  const currentSet = exercise.sets[exercise.sets.length - 1];
  // For a timed exercise the hold block stands in for the last set until it has a time;
  // a saved or imported set with a duration is a logged one.
  const pendingHold =
    trackingType === "time" && currentSet && !currentSet.completed && !(Number(currentSet.duration) > 0)
      ? currentSet
      : null;

  // Starts the rest for the set being entered and readies an empty one after it.
  // The next set is left empty on purpose: seeded values would count as a set done.
  const setDone = () => {
    if (!currentSet || !isLoggedSet(currentSet)) return;
    // Only one rest at a time: end the previous one so it cannot linger on the strip.
    if (rest) clearTimer(restTimerId(rest.setId));
    onChange({ ...exercise, sets: [...exercise.sets, { id: generateId(), weight: "", reps: "" }] });
    setRest({ setId: currentSet.id, fresh: true });
  };

  // A hold is over: log its time, ready an empty next set and, if chained, start the rest.
  const holdDone = (hold: Set, seconds: number) => {
    const done: Set = { ...hold, duration: String(seconds), completed: true };
    onChange({
      ...exercise,
      sets: [...exercise.sets.slice(0, -1), done, { id: generateId(), weight: "", reps: "" }],
    });
    if (chainRest) setRest({ setId: hold.id, fresh: true });
  };

  // A rest after a timed set is saved on that set; the seconds are the rest actually taken.
  const restEnded = (setId: string, restSeconds: number) => {
    if (trackingType === "time") {
      onChange({
        ...exercise,
        sets: exercise.sets.map((s) => (s.id === setId ? { ...s, restTaken: String(restSeconds) } : s)),
      });
    }
    setRest(null);
  };

  const updateSet = (id: string, s: Set) => {
    onChange({
      ...exercise,
      sets: exercise.sets.map((set) => (set.id === id ? s : set)),
    });
  };

  const removeSet = (id: string) => {
    if (id === rest?.setId) {
      clearTimer(restTimerId(id));
      setRest(null);
    }
    onChange({
      ...exercise,
      sets: exercise.sets.filter((s) => s.id !== id),
    });
  };

  const lastHeldSec = Number([...exercise.sets].reverse().find((s) => s.completed)?.duration) || 0;

  const average = computeMetric(exercise.sets, meta, "average");
  const peak = computeMetric(exercise.sets, meta, "peak");

  return (
    <div className="exerciseLogger">
      <div className="exerciseLoggerHeader">
        <div>
          <div className="exerciseLoggerTitle">
            <span className="exerciseLoggerCategoryIcon" style={{ color: CATEGORY_COLORS[category] }}>
              {CATEGORY_ICONS[category]}
            </span>
            {exercise.name}
          </div>
          {(average || peak) && (
            <div className="exerciseLoggerStats">
              {average && <span className="exerciseLoggerAvg">Avg: {average.label}</span>}
              {peak && <span className="exerciseLoggerMax">Peak: {peak.label}</span>}
            </div>
          )}
        </div>
        <Badge color={MUSCLE_GROUP_COLORS[exercise.muscleGroup] || "var(--color-text-muted)"}>
          {exercise.muscleGroup}
        </Badge>
      </div>

      {rest && (
        <RestBlock
          key={rest.setId}
          setId={rest.setId}
          setNumber={exercise.sets.findIndex((s) => s.id === rest.setId) + 1}
          category={category}
          autoStart={rest.fresh}
          onSkip={(seconds) => restEnded(rest.setId, seconds)}
        />
      )}

      <div className="exerciseLoggerSets">
        {exercise.sets.map((set, i) =>
          trackingType === "time" ? (
            set !== pendingHold ? (
              <TimedSetRow
                key={set.id}
                set={set}
                index={i}
                onRemove={() => removeSet(set.id)}
                distanceUnit={exercise.distanceUnit}
              />
            ) : null
          ) : (
            <SetRow
              key={set.id}
              set={set}
              index={i}
              onChange={(newSet) => updateSet(set.id, { ...newSet, id: set.id })}
              onRemove={() => removeSet(set.id)}
              trackWeight={meta.trackWeight}
            />
          ),
        )}
      </div>
      {pendingHold && !rest && (
        <>
          <TimedSetBlock
            key={pendingHold.id}
            setId={pendingHold.id}
            setNumber={exercise.sets.length}
            category={category}
            initialTargetSec={lastHeldSec || DEFAULT_PRESETS[category].work[0]}
            chainRest={chainRest}
            onHoldDone={(seconds) => holdDone(pendingHold, seconds)}
          />
          <label className="exerciseLoggerChain">
            <input type="checkbox" checked={chainRest} onChange={(e) => setChainRest(e.target.checked)} />
            Chain rest timer
          </label>
          {trackDistance && (
            <div className="exerciseLoggerDistance">
              <NumericInput
                value={pendingHold.distance || ""}
                onChange={(v) => updateSet(pendingHold.id, { ...pendingHold, distance: v })}
                placeholder="0"
                step={0.1}
                style={{ width: "90px" }}
              />
              <span>{exercise.distanceUnit ?? "km"}</span>
            </div>
          )}
        </>
      )}
      {trackingType !== "time" && (
        <PrimaryButton onClick={setDone} disabled={!currentSet || !isLoggedSet(currentSet)}>
          Set done
        </PrimaryButton>
      )}
      {!pendingHold && (
        <Button onClick={addSet} variant="ghost" small>
          + Set
        </Button>
      )}
    </div>
  );
}

export default ExerciseLogger;
