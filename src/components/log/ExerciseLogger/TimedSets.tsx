import { useState, type ReactNode } from "react";
import { DEFAULT_PRESETS } from "../../../constants/timerPresets";
import { ExerciseLog, Set } from "../../../types";
import { getExerciseMeta } from "../../../utils/metrics";
import { generateId } from "../../../utils/id";
import { currentSetNumber } from "../../../utils/sessionList";
import { currentSetIndex, virtualSetId } from "../../../utils/setModel";
import TimedSetBlock from "../TimedSetBlock";
import TimedSetRow from "../TimedSetRow";

interface TimedSetsProps {
  exercise: ExerciseLog;
  onChange: (exercise: ExerciseLog) => void;
  resting: boolean;
  /** Kicker and title, placed under the hold block. */
  heading: ReactNode;
  onRest: (setId: string) => void;
  onEndRest: () => void;
  onRemove: (index: number) => void;
}

// The hold block for the current set, then the logged holds.
export function TimedSets({ exercise, onChange, resting, heading, onRest, onEndRest, onRemove }: TimedSetsProps) {
  const { category, trackDistance, distanceUnit } = getExerciseMeta(exercise);
  // Isometric holds and loaded carries chain into a rest before the next set;
  // steady-state cardio usually doesn't. The switch lets the person override it.
  const [chainRest, setChainRest] = useState(category !== "cardio");

  const index = currentSetIndex(exercise);
  const { number, total } = currentSetNumber(exercise);
  const hold: Set = exercise.sets[index] ?? { id: virtualSetId(exercise), weight: "", reps: "" };

  // The hold's timer is already reset, so a virtual id can give way to the set's own.
  const holdDone = (seconds: number, distance: string) => {
    const id = hold.id === virtualSetId(exercise) ? generateId() : hold.id;
    const logged: Set = { ...hold, id, duration: String(seconds), completed: true };
    if (parseFloat(distance) > 0) logged.distance = distance;
    onChange({
      ...exercise,
      sets: index < exercise.sets.length ? exercise.sets.map((s, i) => (i === index ? logged : s)) : [...exercise.sets, logged],
    });
    if (chainRest) onRest(id);
  };

  const lastHeldSec = Number(exercise.sets.findLast((s) => Number(s.duration) > 0)?.duration) || 0;

  return (
    <>
      <TimedSetBlock
        // The virtual next set keeps its id, so the index makes each new hold a fresh one.
        key={`${hold.id}:${index}`}
        setId={hold.id}
        setNumber={number}
        setTotal={total}
        category={category}
        initialTargetSec={lastHeldSec || DEFAULT_PRESETS[category].work[0]}
        chainRest={chainRest}
        onChainRestChange={setChainRest}
        distanceUnit={trackDistance ? distanceUnit : undefined}
        resting={resting}
        heading={heading}
        onHoldDone={holdDone}
        onEndRest={onEndRest}
      />
      <div className="exerciseLoggerTimedRows">
        {exercise.sets.map((set, i) =>
          i === index ? null : (
            <TimedSetRow key={set.id} set={set} index={i} onRemove={() => onRemove(i)} distanceUnit={distanceUnit} />
          ),
        )}
      </div>
    </>
  );
}

export default TimedSets;
