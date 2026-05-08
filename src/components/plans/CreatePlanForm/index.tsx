import { useEffect, useRef, useState } from "react";
import { Field, PrimaryButton, SaveFailedAlert, Toast, WarningIcon } from "../../shared";
import { TrainingPlan } from "../../../types";
import { buildPlan, errorCount, validatePlan } from "./buildPlan";
import { ExerciseFields } from "./ExerciseFields";
import { ExerciseSummary } from "./ExerciseSummary";
import { ADD_BUTTON, useExerciseList } from "./useExerciseList";
import "./CreatePlanForm.css";

interface CreatePlanFormProps {
  /** Returns false when the browser refused to store the plan. */
  onSave: (plan: TrainingPlan) => boolean;
  onCancel: () => void;
}

const PLAN_NAME = 'input[name="planName"]';

export function CreatePlanForm({ onSave, onCancel }: CreatePlanFormProps) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  // Errors show after the first Save and then follow every edit.
  const [submitted, setSubmitted] = useState(false);
  // Refused Saves in a row; the form keeps its values meanwhile.
  const [saveFailures, setSaveFailures] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  // A fresh object per request, so a repeated Save with the same errors still moves focus.
  const [focusRequest, setFocusRequest] = useState<{ selector: string } | null>(null);
  const focus = (selector: string) => setFocusRequest({ selector });
  const list = useExerciseList(focus);
  const { exercises, openId, removed } = list;

  // Centre the control so the sticky Save bar never covers it.
  useEffect(() => {
    const el = focusRequest && formRef.current?.querySelector<HTMLElement>(focusRequest.selector);
    if (!el) return;
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: "center" });
  }, [focusRequest]);

  const errors = submitted ? validatePlan(name, exercises) : null;
  const count = errors ? errorCount(errors) : 0;

  const save = () => {
    const result = buildPlan(name, desc, exercises);
    if ("plan" in result) {
      if (!onSave(result.plan)) setSaveFailures((n) => n + 1);
      return;
    }
    setSaveFailures(0);
    setSubmitted(true);
    const [firstUnnamed] = result.errors.unnamed;
    if (result.errors.name) focus(PLAN_NAME);
    else if (firstUnnamed) list.open(firstUnnamed);
    else focus(ADD_BUTTON);
  };

  return (
    <form ref={formRef} className="createPlanForm" aria-labelledby="createPlanFormTitle" noValidate
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <header className="createPlanFormHeader">
        <h1 id="createPlanFormTitle" className="createPlanFormTitle">New plan</h1>
        <button type="button" className="createPlanFormCancel" onClick={onCancel}>Cancel</button>
      </header>

      <div className="createPlanFormName">
        <Field label="Name" name="planName" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Push Day" error={errors?.name} />
      </div>
      <Field label="Description · optional" value={desc} onChange={(e) => setDesc(e.target.value)}
        placeholder="e.g. Chest, shoulders, triceps" />

      <section className="createPlanFormExercises" aria-labelledby="createPlanFormExercisesTitle">
        <h2 id="createPlanFormExercisesTitle" className="createPlanFormSection">Exercises · {exercises.length}</h2>
        <ul className="createPlanFormList" role="list">
          {exercises.map((ex, i) => {
            const invalid = !!errors?.unnamed.includes(ex.id);
            return (
              <li key={ex.id}>
                {ex.id === openId ? (
                  <ExerciseFields exercise={ex} number={i + 1} invalid={invalid} onChange={list.update}
                    onRemove={() => list.remove(ex.id)} />
                ) : (
                  <ExerciseSummary exercise={ex} number={i + 1} invalid={invalid} onExpand={() => list.open(ex.id)} />
                )}
              </li>
            );
          })}
        </ul>
        {errors?.exercises && <p className="exerciseError"><WarningIcon />{errors.exercises}</p>}
        <button type="button" className="createPlanFormAdd" data-add-exercise onClick={list.add}>+ Add exercise</button>
      </section>

      <div className="createPlanFormBar">
        {removed && (
          <Toast key={removed.exercise.id} inline message={`Exercise ${removed.index + 1} removed`} actionLabel="Undo"
            onAction={list.undo} onDismiss={list.clearRemoved} />
        )}
        {count > 0 && (
          <p role="alert" className="createPlanFormSummary">
            <WarningIcon />
            {count === 1 ? "1 thing to fix before saving" : `${count} things to fix before saving`}
          </p>
        )}
        {/* Keyed on the count, so a refused Try again is announced again. */}
        {saveFailures > 0 && (
          <SaveFailedAlert key={saveFailures}>
            This browser refused to store the plan: storage is full or blocked. Your plan is still on this
            screen. Try again.
          </SaveFailedAlert>
        )}
        <PrimaryButton type="submit">{saveFailures > 0 ? "Try again" : "Save plan"}</PrimaryButton>
      </div>
    </form>
  );
}

export default CreatePlanForm;
