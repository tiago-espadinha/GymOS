import { Button, Badge } from "../../shared";
import Colors from "../../../constants/colors";
import { MUSCLE_GROUP_COLORS } from "../../../constants/muscleGroups";
import { generateId } from "../../../utils/id";
import { ExerciseLog } from "../../../types";
import SetRow from "../SetRow";
import "./ExerciseLogger.css";

interface ExerciseLoggerProps {
  exercise: ExerciseLog;
  onChange: (exercise: ExerciseLog) => void;
}

export function ExerciseLogger({ exercise, onChange }: ExerciseLoggerProps) {
  const addSet = () => {
    const last = exercise.sets[exercise.sets.length - 1];
    const seed = last
      ? { weight: last.weight, reps: last.reps }
      : { weight: "", reps: "" };
    onChange({
      ...exercise,
      sets: [...exercise.sets, { id: generateId(), ...seed }],
    });
  };

  const updateSet = (id: string, s: any) => {
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

  const volume = exercise.sets.reduce(
    (sum, s) => sum + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0),
    0,
  );
  const maxW = Math.max(
    0,
    ...exercise.sets.map((s) => parseFloat(s.weight) || 0),
  );

  return (
    <div className="exerciseLogger">
      <div className="exerciseLoggerHeader">
        <div>
          <div className="exerciseLoggerTitle">{exercise.name}</div>
          {volume > 0 && (
            <div className="exerciseLoggerStats">
              <span className="exerciseLoggerMax">Max: {maxW} kg</span>
              <span className="exerciseLoggerVolume">
                Vol: {volume.toFixed(0)} kg
              </span>
            </div>
          )}
        </div>
        <Badge
          color={MUSCLE_GROUP_COLORS[exercise.muscleGroup] || Colors.muted}
        >
          {exercise.muscleGroup}
        </Badge>
      </div>

      <div className="exerciseLoggerSets">
        {exercise.sets.map((set, i) => (
          <SetRow
            key={set.id}
            set={set}
            index={i}
            onChange={(newSet) => updateSet(set.id, { ...newSet, id: set.id })}
            onRemove={() => removeSet(set.id)}
          />
        ))}
      </div>
      <Button onClick={addSet} variant="ghost" small>
        + Set
      </Button>
    </div>
  );
}

export default ExerciseLogger;
