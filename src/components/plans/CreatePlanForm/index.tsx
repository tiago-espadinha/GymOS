import { useState } from "react";
import { Button, Input, Label, Select } from "../../shared";
import { MUSCLE_GROUPS } from "../../../constants/muscleGroups";
import {
  EXERCISE_CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  DEFAULT_TRACKING_TYPE,
  DEFAULT_TRACK_WEIGHT,
  DEFAULT_TRACK_DISTANCE,
} from "../../../constants/exerciseTypes";
import { generateId } from "../../../utils/id";
import { TrainingPlan, Exercise, ExerciseCategory, TrackingType } from "../../../types";
import "./CreatePlanForm.css";

interface CreatePlanFormProps {
  onSave: (plan: TrainingPlan) => void;
  onCancel: () => void;
}

interface ExerciseInput extends Exercise {
  id: string;
}

function makeExercise(): ExerciseInput {
  return { id: generateId(), name: "", muscleGroup: "Chest", category: "strength" };
}

export function CreatePlanForm({ onSave, onCancel }: CreatePlanFormProps) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [exercises, setExercises] = useState<ExerciseInput[]>([makeExercise()]);
  const [error, setError] = useState("");

  const addExercise = () => {
    setExercises((ex) => [...ex, makeExercise()]);
  };

  const removeExercise = (id: string) => {
    setExercises((ex) => ex.filter((e) => e.id !== id));
  };

  const updateExercise = (id: string, field: string, value: string) => {
    setExercises((ex) => ex.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  };

  const handleCategoryChange = (id: string, category: ExerciseCategory) => {
    setExercises((ex) =>
      ex.map((e) => {
        if (e.id !== id) return e;
        const next: ExerciseInput = {
          ...e,
          category,
          trackingType: DEFAULT_TRACKING_TYPE[category],
          trackWeight: DEFAULT_TRACK_WEIGHT[category],
          trackDistance: DEFAULT_TRACK_DISTANCE[category],
        };
        // Nudge the muscle group towards something sensible for the new
        // category, but only if it still has the default placeholder value.
        if (category === "cardio" && e.muscleGroup === "Chest") next.muscleGroup = "Cardio";
        if (category !== "cardio" && e.muscleGroup === "Cardio") next.muscleGroup = "Chest";
        return next;
      }),
    );
  };

  const handleTrackingTypeChange = (id: string, trackingType: TrackingType) => {
    setExercises((ex) => ex.map((e) => (e.id === id ? { ...e, trackingType } : e)));
  };

  const handleTimeGoalChange = (id: string, timeGoal: "longer" | "shorter") => {
    setExercises((ex) => ex.map((e) => (e.id === id ? { ...e, timeGoal } : e)));
  };

  const toggleField = (id: string, field: "trackWeight" | "trackDistance") => {
    setExercises((ex) =>
      ex.map((e) => (e.id === id ? { ...e, [field]: !e[field] } : e)),
    );
  };

  const save = () => {
    if (!name.trim()) {
      setError("Plan name is required");
      return;
    }
    const valid = exercises.filter((e) => e.name.trim());
    if (valid.length === 0) {
      setError("Add at least one exercise");
      return;
    }
    onSave({
      id: generateId(),
      name: name.trim(),
      desc: desc.trim(),
      exercises: valid.map((e) => ({ ...e, name: e.name.trim() })),
    });
  };

  return (
    <div className="createPlanForm">
      <div className="createPlanFormTitle">New Training Plan</div>

      <div className="createPlanFormGrid">
        <div>
          <Label>Plan Name</Label>
          <Input value={name} onChange={setName} placeholder="e.g. Push Day" />
        </div>
        <div>
          <Label>Description (optional)</Label>
          <Input value={desc} onChange={setDesc} placeholder="e.g. Chest, shoulders, triceps" />
        </div>
      </div>

      <Label>Exercises</Label>
      <div className="createPlanFormExercises">
        {exercises.map((ex, i) => {
          const category = ex.category || "strength";
          const trackingType = ex.trackingType || DEFAULT_TRACKING_TYPE[category];
          const trackDistance = ex.trackDistance ?? category === "cardio";
          const showGoalToggle = trackingType === "time" && !trackDistance;
          const timeGoal = ex.timeGoal || "longer";
          return (
            <div key={ex.id} className="createPlanFormExerciseGroup">
              <div className="createPlanFormExercise">
                <span className="createPlanFormExerciseIndex">{i + 1}</span>
                <Input
                  value={ex.name}
                  onChange={(v) => updateExercise(ex.id, "name", v)}
                  placeholder="Exercise name"
                  style={{ flex: 1 }}
                />
                <Select
                  value={category}
                  onChange={(v) => handleCategoryChange(ex.id, v as ExerciseCategory)}
                  style={{ width: "150px", flexShrink: 0 }}
                >
                  {EXERCISE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_ICONS[c]} {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </Select>
                <Select
                  value={ex.muscleGroup}
                  onChange={(v) => updateExercise(ex.id, "muscleGroup", v)}
                  style={{ width: "140px", flexShrink: 0 }}
                >
                  {MUSCLE_GROUPS.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </Select>
                {exercises.length > 1 && (
                  <button onClick={() => removeExercise(ex.id)} className="createPlanFormRemove">
                    ×
                  </button>
                )}
              </div>

              <div className="createPlanFormTrackingRow">
                <div className="createPlanFormTrackingToggle">
                  <button
                    type="button"
                    className={`createPlanFormChip ${trackingType === "reps" ? "active" : ""}`}
                    onClick={() => handleTrackingTypeChange(ex.id, "reps")}
                  >
                    Reps
                  </button>
                  <button
                    type="button"
                    className={`createPlanFormChip ${trackingType === "time" ? "active" : ""}`}
                    onClick={() => handleTrackingTypeChange(ex.id, "time")}
                  >
                    Time
                  </button>
                </div>

                {trackingType === "reps" && category !== "strength" && (
                  <label className="createPlanFormCheckbox">
                    <input
                      type="checkbox"
                      checked={!!ex.trackWeight}
                      onChange={() => toggleField(ex.id, "trackWeight")}
                    />
                    Track added weight
                  </label>
                )}

                {trackingType === "time" && category === "cardio" && (
                  <label className="createPlanFormCheckbox">
                    <input
                      type="checkbox"
                      checked={ex.trackDistance ?? true}
                      onChange={() => toggleField(ex.id, "trackDistance")}
                    />
                    Track distance
                  </label>
                )}

                {showGoalToggle && (
                  <div className="createPlanFormTrackingToggle" title="Which direction counts as a better set">
                    <button
                      type="button"
                      className={`createPlanFormChip ${timeGoal === "longer" ? "active" : ""}`}
                      onClick={() => handleTimeGoalChange(ex.id, "longer")}
                    >
                      Longer is better
                    </button>
                    <button
                      type="button"
                      className={`createPlanFormChip ${timeGoal === "shorter" ? "active" : ""}`}
                      onClick={() => handleTimeGoalChange(ex.id, "shorter")}
                    >
                      Shorter is better
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && <div className="createPlanFormError">{error}</div>}

      <div className="createPlanFormActions">
        <Button onClick={addExercise} variant="ghost" small>
          + Add Exercise
        </Button>
        <div className="createPlanFormSpacer" />
        <Button onClick={onCancel} variant="ghost" small>
          Cancel
        </Button>
        <Button onClick={save} small>
          Save Plan
        </Button>
      </div>
    </div>
  );
}

export default CreatePlanForm;
