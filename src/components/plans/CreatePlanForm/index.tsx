import { useRef, useState } from "react";
import { Field, PillButton, PrimaryButton } from "../../shared";
import { generateId } from "../../../utils/id";
import { TrainingPlan, Exercise } from "../../../types";
import { buildPlan, PlanErrors } from "./buildPlan";
import { ExerciseFields } from "./ExerciseFields";
import "./CreatePlanForm.css";

interface CreatePlanFormProps {
  onSave: (plan: TrainingPlan) => void;
  onCancel: () => void;
}

function makeExercise(): Exercise {
  return { id: generateId(), name: "", muscleGroup: "Chest", category: "strength" };
}

export function CreatePlanForm({ onSave, onCancel }: CreatePlanFormProps) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([makeExercise()]);
  const [errors, setErrors] = useState<PlanErrors>({});
  const formRef = useRef<HTMLFormElement>(null);

  const updateExercise = (updated: Exercise) =>
    setExercises((all) => all.map((e) => (e.id === updated.id ? updated : e)));

  const removeExercise = (id: string) => setExercises((all) => all.filter((e) => e.id !== id));

  const save = () => {
    const result = buildPlan(name, desc, exercises);
    if ("errors" in result) {
      setErrors(result.errors);
      // The exercises error is announced as an alert; the name error needs focus to be heard.
      if (result.errors.name) formRef.current?.querySelector<HTMLInputElement>('input[name="planName"]')?.focus();
      return;
    }
    onSave(result.plan);
  };

  return (
    <form
      ref={formRef}
      className="createPlanForm"
      aria-labelledby="createPlanFormTitle"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <h2 id="createPlanFormTitle" className="createPlanFormTitle">
        New plan
      </h2>

      <Field
        label="Plan name"
        name="planName"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Push Day"
        error={errors.name}
      />
      <Field
        label="Description (optional)"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="e.g. Chest, shoulders, triceps"
      />

      <h3 className="createPlanFormSection">Exercises</h3>
      <ul className="createPlanFormExercises" role="list">
        {exercises.map((ex, i) => (
          <ExerciseFields
            key={ex.id}
            exercise={ex}
            index={i}
            canRemove={exercises.length > 1}
            onChange={updateExercise}
            onRemove={() => removeExercise(ex.id)}
          />
        ))}
      </ul>

      {errors.exercises && (
        <p role="alert" className="createPlanFormError">
          {errors.exercises}
        </p>
      )}

      <PillButton variant="outline-white" onClick={() => setExercises((all) => [...all, makeExercise()])}>
        + Add exercise
      </PillButton>

      <div className="createPlanFormActions">
        <PrimaryButton type="submit" tone="lime">
          Save plan
        </PrimaryButton>
        <PillButton variant="outline-white" onClick={onCancel}>
          Cancel
        </PillButton>
      </div>
    </form>
  );
}

export default CreatePlanForm;
