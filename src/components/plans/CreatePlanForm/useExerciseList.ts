import { useState } from "react";
import { generateId } from "../../../utils/id";
import { Exercise } from "../../../types";

interface Removed {
  exercise: Exercise;
  index: number;
}

/** Selectors for the controls focus moves to after a change. */
const nameField = (id: string) => `[data-exercise-name="${CSS.escape(id)}"]`;
const headerOf = (id: string) => `[data-exercise-header="${CSS.escape(id)}"]`;
export const ADD_BUTTON = "[data-add-exercise]";

function makeExercise(): Exercise {
  return { id: generateId(), name: "", muscleGroup: "Chest", category: "strength" };
}

/**
 * The form's exercises, with one expanded at a time and the last removal kept for Undo.
 * `focus` takes a selector for the control that should have focus after the next render.
 */
export function useExerciseList(focus: (selector: string) => void) {
  const [exercises, setExercises] = useState<Exercise[]>(() => [makeExercise()]);
  const [openId, setOpenId] = useState<string | null>(() => exercises[0].id);
  const [removed, setRemoved] = useState<Removed | null>(null);

  const update = (updated: Exercise) => setExercises((all) => all.map((e) => (e.id === updated.id ? updated : e)));

  const open = (id: string) => {
    setOpenId(id);
    focus(nameField(id));
  };

  const add = () => {
    const exercise = makeExercise();
    setExercises((all) => [...all, exercise]);
    open(exercise.id);
  };

  // Focus goes to the previous exercise's header, the new first one, or Add exercise when none is left.
  const remove = (id: string) => {
    const index = exercises.findIndex((e) => e.id === id);
    const rest = exercises.filter((e) => e.id !== id);
    setExercises(rest);
    setRemoved({ exercise: exercises[index], index });
    setOpenId(null);
    focus(rest.length ? headerOf(rest[Math.max(0, index - 1)].id) : ADD_BUTTON);
  };

  const undo = () => {
    if (!removed) return;
    setExercises((all) => [...all.slice(0, removed.index), removed.exercise, ...all.slice(removed.index)]);
    setRemoved(null);
    open(removed.exercise.id);
  };

  return { exercises, openId, removed, update, open, add, remove, undo, clearRemoved: () => setRemoved(null) };
}
