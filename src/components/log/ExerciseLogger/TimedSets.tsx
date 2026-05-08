import { useState } from "react";
import { NumericInput } from "../../shared";
import { DEFAULT_PRESETS } from "../../../constants/timerPresets";
import { ExerciseLog, Set } from "../../../types";
import { getExerciseMeta } from "../../../utils/metrics";
import { virtualSetId } from "../../../utils/setModel";
import TimedSetBlock from "../TimedSetBlock";
import TimedSetRow from "../TimedSetRow";

interface TimedSetsProps {
  exercise: ExerciseLog;
  onChange: (exercise: ExerciseLog) => void;
  resting: boolean;
  onRest: (setId: string) => void;
  onRemove: (index: number) => void;
}

// The first set without a held time; a distance alone does not end the hold.
const holdIndex = (sets: Set[]) => {
  const i = sets.findIndex((s) => !s.completed && !(Number(s.duration) > 0));
  return i === -1 ? sets.length : i;
};

// Logged holds, then the hold block for the next set (restyled in T-046).
export function TimedSets({ exercise, onChange, resting, onRest, onRemove }: TimedSetsProps) {
  const { category, trackDistance } = getExerciseMeta(exercise);
  // Isometric holds and loaded carries chain into a rest before the next set;
  // steady-state cardio usually doesn't. The toggle lets the person override it.
  const [chainRest, setChainRest] = useState(category !== "cardio");

  const index = holdIndex(exercise.sets);
  const hold: Set = exercise.sets[index] ?? { id: virtualSetId(exercise, index), weight: "", reps: "" };

  // Writes the hold, appending it when it was the virtual next set.
  const writeHold = (next: Set) =>
    onChange({
      ...exercise,
      sets: index < exercise.sets.length ? exercise.sets.map((s, i) => (i === index ? next : s)) : [...exercise.sets, next],
    });

  const holdDone = (seconds: number) => {
    writeHold({ ...hold, duration: String(seconds), completed: true });
    if (chainRest) onRest(hold.id);
  };

  const lastHeldSec = Number(exercise.sets.findLast((s) => s.completed)?.duration) || 0;

  return (
    <>
      <div className="exerciseLoggerTimedRows">
        {exercise.sets.map((set, i) =>
          i === index ? null : (
            <TimedSetRow key={set.id} set={set} index={i} onRemove={() => onRemove(i)} distanceUnit={exercise.distanceUnit} />
          ),
        )}
      </div>
      {!resting && (
        <>
          <TimedSetBlock
            key={hold.id}
            setId={hold.id}
            setNumber={index + 1}
            category={category}
            initialTargetSec={lastHeldSec || DEFAULT_PRESETS[category].work[0]}
            chainRest={chainRest}
            onHoldDone={holdDone}
          />
          <label className="exerciseLoggerChain">
            <input type="checkbox" checked={chainRest} onChange={(e) => setChainRest(e.target.checked)} />
            Chain rest timer
          </label>
          {trackDistance && (
            <div className="exerciseLoggerDistance">
              <NumericInput
                value={hold.distance || ""}
                onChange={(v) => writeHold({ ...hold, distance: v })}
                placeholder="0"
                step={0.1}
                style={{ width: "90px" }}
              />
              <span>{exercise.distanceUnit ?? "km"}</span>
            </div>
          )}
        </>
      )}
    </>
  );
}

export default TimedSets;
