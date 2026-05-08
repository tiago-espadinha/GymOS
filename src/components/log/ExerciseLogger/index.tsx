import { useState } from "react";
import { Badge, Button, PrimaryButton } from "../../shared";
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

  const addSet = () => {
    const last = exercise.sets[exercise.sets.length - 1];
    const seed: Partial<Set> =
      trackingType === "time"
        ? { duration: last?.duration, distance: "" }
        : { weight: last?.weight || "", reps: last?.reps || "" };
    onChange({
      ...exercise,
      sets: [...exercise.sets, { id: generateId(), weight: "", reps: "", ...seed }],
    });
  };

  // The set being entered is always the last one.
  const currentSet = exercise.sets[exercise.sets.length - 1];

  // Starts the rest for the set being entered and readies an empty one after it.
  // The next set is left empty on purpose: seeded values would count as a set done.
  const setDone = () => {
    if (!currentSet || !isLoggedSet(currentSet)) return;
    // Only one rest at a time: end the previous one so it cannot linger on the strip.
    if (rest) clearTimer(restTimerId(rest.setId));
    onChange({ ...exercise, sets: [...exercise.sets, { id: generateId(), weight: "", reps: "" }] });
    setRest({ setId: currentSet.id, fresh: true });
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

      {rest && trackingType !== "time" && (
        <RestBlock
          key={rest.setId}
          setId={rest.setId}
          setNumber={exercise.sets.findIndex((s) => s.id === rest.setId) + 1}
          category={category}
          autoStart={rest.fresh}
          onSkip={() => setRest(null)}
        />
      )}

      <div className="exerciseLoggerSets">
        {exercise.sets.map((set, i) =>
          trackingType === "time" ? (
            <TimedSetRow
              key={set.id}
              set={set}
              index={i}
              onChange={(newSet) => updateSet(set.id, { ...newSet, id: set.id })}
              onRemove={() => removeSet(set.id)}
              category={category}
              trackDistance={trackDistance}
              distanceUnit={exercise.distanceUnit}
            />
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
      {trackingType !== "time" && (
        <PrimaryButton onClick={setDone} disabled={!currentSet || !isLoggedSet(currentSet)}>
          Set done
        </PrimaryButton>
      )}
      <Button onClick={addSet} variant="ghost" small>
        + Set
      </Button>
    </div>
  );
}

export default ExerciseLogger;
