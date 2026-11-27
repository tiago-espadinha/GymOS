import { useState, type ReactNode } from "react";
import { WORK_PRESETS } from "../../../constants/timerPresets";
import { ExerciseLog, Set } from "../../../types";
import { getExerciseMeta } from "../../../utils/metrics";
import { generateId } from "../../../utils/id";
import { NO_VALUES, currentSetNumber } from "../../../utils/sessionList";
import { currentSetIndex, virtualSetId } from "../../../utils/setModel";
import TimedSetBlock from "../TimedSetBlock";
import SetsTable from "../SetsTable";
import { useUnitPrefs } from "../../../utils/unitPrefs";
import { storedDistance } from "../../../utils/units";

interface TimedSetsProps {
  exercise: ExerciseLog;
  onChange: (exercise: ExerciseLog) => void;
  resting: boolean;
  /** Kicker and title, placed under the hold block. */
  heading: ReactNode;
  /** The logged set being edited; the hold block steps aside meanwhile. */
  editing: { index: number; label: string } | null;
  format: (set: Set) => string;
  lastTime: ((index: number) => string) | null;
  onRest: (setId: string) => void;
  onEndRest: () => void;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
}

// The hold block for the current set, then the sets table (hidden during a rest, as for reps).
export function TimedSets(props: TimedSetsProps) {
  const { exercise, onChange, resting, editing } = props;
  const { category, trackDistance, distanceUnit } = getExerciseMeta(exercise);
  const units = useUnitPrefs();
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
    if (parseFloat(distance) > 0) logged.distance = storedDistance(distance, units.distance, distanceUnit);
    onChange({
      ...exercise,
      sets: index < exercise.sets.length ? exercise.sets.map((s, i) => (i === index ? logged : s)) : [...exercise.sets, logged],
    });
    if (chainRest) props.onRest(id);
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
        initialTargetSec={lastHeldSec || WORK_PRESETS[category][0]}
        chainRest={chainRest}
        onChainRestChange={setChainRest}
        distanceUnit={trackDistance ? units.distance : undefined}
        resting={resting}
        hidden={Boolean(editing)}
        heading={props.heading}
        onHoldDone={holdDone}
        onEndRest={props.onEndRest}
      />
      {/* Kept while editing: a hold that ends meanwhile starts a rest under the edit panel. */}
      {(!resting || editing) && exercise.sets.length > 0 && (
        <SetsTable
          sets={exercise.sets}
          // The hold block is the current set, so the table has no NOW row.
          currentIndex={-1}
          draftLabel={NO_VALUES}
          editing={editing}
          format={props.format}
          lastTime={props.lastTime}
          onEdit={props.onEdit}
          onRemove={props.onRemove}
        />
      )}
    </>
  );
}

export default TimedSets;
