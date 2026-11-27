import { useEffect, useRef, useState } from "react";
import { ConfirmSheet, Field, Icon, PrimaryButton, SaveFailedAlert, SecondaryButton, Toast } from "../../shared";
import { TrainingPlan } from "../../../types";
import { buildPlan, draftOf, errorCount, validatePlan } from "./buildPlan";
import { ExerciseFields } from "./ExerciseFields";
import { ExerciseSummary } from "./ExerciseSummary";
import { ADD_BUTTON, useExerciseList } from "./useExerciseList";
import "./CreatePlanForm.css";

interface CreatePlanFormProps {
  /** The plan to edit; without it the form makes a new one. */
  plan?: TrainingPlan;
  /** Editing: what saving the draft would rename in past sessions, or null. */
  historyNote?: (draft: TrainingPlan) => string | null;
  /** Returns false when the browser refused to store the plan. */
  onSave: (plan: TrainingPlan) => boolean;
  onCancel: () => void;
}

const sameContent = (a: TrainingPlan, b: TrainingPlan) =>
  a.name === b.name && a.desc === b.desc && JSON.stringify(a.exercises) === JSON.stringify(b.exercises);

const PLAN_NAME = 'input[name="planName"]';

export function CreatePlanForm({ plan, historyNote, onSave, onCancel }: CreatePlanFormProps) {
  const [name, setName] = useState(plan?.name ?? "");
  const [desc, setDesc] = useState(plan?.desc ?? "");
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  // Errors show after the first Save and then follow every edit.
  const [submitted, setSubmitted] = useState(false);
  // Refused Saves in a row; the form keeps its values meanwhile.
  const [saveFailures, setSaveFailures] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  // A fresh object per request, so a repeated Save with the same errors still moves focus.
  const [focusRequest, setFocusRequest] = useState<{ selector: string } | null>(null);
  const focus = (selector: string) => setFocusRequest({ selector });
  const list = useExerciseList(focus, plan?.exercises);
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
  const draft = plan && draftOf(plan.id, name, desc, exercises);
  const note = draft && historyNote?.(draft);

  // An edit with unsaved changes asks first; anything else just closes.
  const cancel = () => (draft && !sameContent(draft, plan) ? setConfirmDiscard(true) : onCancel());

  const save = () => {
    const result = buildPlan(name, desc, exercises, plan?.id);
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
        <h1 id="createPlanFormTitle" className="createPlanFormTitle">{plan ? "Edit plan" : "New plan"}</h1>
        <button type="button" className="createPlanFormCancel" onClick={cancel}>Cancel</button>
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
        {errors?.exercises && <p className="exerciseError"><Icon name="warning" />{errors.exercises}</p>}
        <SecondaryButton data-add-exercise onClick={list.add}>
          <Icon name="plus" size="md" />
          Add exercise
        </SecondaryButton>
      </section>

      <div className="createPlanFormBar">
        {removed && (
          <Toast key={removed.exercise.id} inline message={`Exercise ${removed.index + 1} removed`} actionLabel="Undo"
            onAction={list.undo} onDismiss={list.clearRemoved} />
        )}
        {count > 0 && (
          <p role="alert" className="createPlanFormSummary">
            <Icon name="warning" />
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
        {note && <p className="createPlanFormNote">{note}</p>}
        <PrimaryButton type="submit">{saveFailures > 0 ? "Try again" : plan ? "Save changes" : "Save plan"}</PrimaryButton>
      </div>

      {confirmDiscard && plan && (
        <ConfirmSheet kicker="Discard" title="Discard changes?" text={`Your edits are lost. ${plan.name} stays as it was.`}
          confirmLabel="Discard changes" keepLabel="Keep editing" onConfirm={onCancel}
          onClose={() => setConfirmDiscard(false)} />
      )}
    </form>
  );
}

export default CreatePlanForm;
