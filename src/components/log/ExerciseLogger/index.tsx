import { Button, Badge } from "../../shared";
import Colors from "../../../constants/colors";
import { MUSCLE_GROUP_COLORS } from "../../../constants/muscleGroups";
import { CATEGORY_ICONS, CATEGORY_COLORS } from "../../../constants/exerciseTypes";
import { generateId } from "../../../utils/id";
import { ExerciseLog, Set } from "../../../types";
import { getExerciseMeta, computeMetric } from "../../../utils/metrics";
import SetRow from "../SetRow";
import TimedSetRow from "../TimedSetRow";
import "./ExerciseLogger.css";

interface ExerciseLoggerProps {
  exercise: ExerciseLog;
  onChange: (exercise: ExerciseLog) => void;
}

export function ExerciseLogger({ exercise, onChange }: ExerciseLoggerProps) {
  const meta = getExerciseMeta(exercise);
  const { category, trackingType, trackDistance } = meta;

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

  const updateSet = (id: string, s: Set) => {
    onChange({
      ...exercise,
      sets: exercise.sets.map((set) => (set.id === id ? s : set)),
    });
  };

  const removeSet = (id: string) => {
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
        <Badge color={MUSCLE_GROUP_COLORS[exercise.muscleGroup] || Colors.muted}>
          {exercise.muscleGroup}
        </Badge>
      </div>

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
              category={category}
              trackWeight={meta.trackWeight}
            />
          ),
        )}
      </div>
      <Button onClick={addSet} variant="ghost" small>
        + Set
      </Button>
    </div>
  );
}

export default ExerciseLogger;
