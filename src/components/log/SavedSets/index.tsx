import { ReactNode, useEffect, useRef } from "react";
import { Icon, SecondaryButton } from "../../shared";
import { ExerciseLog, Set } from "../../../types";
import { generateId } from "../../../utils/id";
import { useUnitPrefs } from "../../../utils/unitPrefs";
import { Column, copySet, setColumns } from "./columns";
import SetField from "../SetField";
import "../ExerciseLogger/ExerciseLogger.css";
import "./SavedSets.css";

interface SavedSetsProps {
  exercise: ExerciseLog;
  onChange: (exercise: ExerciseLog) => void;
  titleId: string;
  /** Navigation on top, given the set count. */
  header: (setLabel: string) => ReactNode;
  footer: ReactNode;
}

// An exercise of a saved session: its sets as typeable rows to correct, add and remove.
// Nothing here is being performed, so there are no timers and no current set.
export function SavedSets({ exercise, onChange, titleId, header, footer }: SavedSetsProps) {
  const columns = setColumns(exercise, useUnitPrefs());
  const { sets } = exercise;

  const update = (id: string, key: Column["key"], value: string | undefined) =>
    onChange({ ...exercise, sets: sets.map((s): Set => (s.id === id ? { ...s, [key]: value } : s)) });

  // The pressed ✕ goes with its row: focus moves to the next row's, else the one before, else Add set.
  const rootRef = useRef<HTMLDivElement>(null);
  const removedAt = useRef<number | null>(null);
  useEffect(() => {
    const index = removedAt.current;
    if (index === null) return;
    removedAt.current = null;
    const root = rootRef.current;
    const buttons = root?.querySelectorAll<HTMLElement>(".savedSetsRemove");
    (buttons?.[index] ?? buttons?.[index - 1] ?? root?.querySelector<HTMLElement>("[data-add-set]"))?.focus();
  }, [sets.length]);

  return (
    <div className="exerciseLogger savedSets" ref={rootRef}>
      {header(`${sets.length} ${sets.length === 1 ? "set" : "sets"}`)}
      <h1 id={titleId} className="exerciseLoggerTitle" tabIndex={-1}>
        {exercise.name}
      </h1>

      {sets.length === 0 ? (
        <p className="savedSetsEmpty">No sets. Add one, or this exercise is left out when you save.</p>
      ) : (
        <div className={columns.length === 1 ? "savedSetsGrid savedSetsGrid--one" : "savedSetsGrid"}>
          <div className="savedSetsRow savedSetsRow--head" aria-hidden="true">
            <span />
            {columns.map((c) => (
              <span key={c.key}>{c.heading}</span>
            ))}
          </div>
          <ol className="savedSetsList" aria-label="Sets">
            {sets.map((set, i) => (
              <li key={set.id} className="savedSetsRow">
                <span className="savedSetsNumber" aria-hidden="true">
                  {i + 1}
                </span>
                {columns.map((c) => (
                  <SetField
                    key={c.key}
                    className="savedSetsField"
                    label={`Set ${i + 1} ${c.name}`}
                    value={set[c.key]}
                    format={c.format}
                    onChange={(value) => update(set.id, c.key, value)}
                  />
                ))}
                <button
                  type="button"
                  className="savedSetsRemove"
                  aria-label={`Remove set ${i + 1}`}
                  onClick={() => {
                    removedAt.current = i;
                    onChange({ ...exercise, sets: sets.filter((s) => s.id !== set.id) });
                  }}
                >
                  <Icon name="close" />
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="exerciseLoggerStack">
        <SecondaryButton
          data-add-set
          onClick={() => onChange({ ...exercise, sets: [...sets, copySet(sets.at(-1), generateId())] })}
        >
          <Icon name="plus" size="md" />
          Add set
        </SecondaryButton>
        {footer}
      </div>
    </div>
  );
}

export default SavedSets;
