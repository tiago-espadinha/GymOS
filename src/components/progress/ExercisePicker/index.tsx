import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { CheckIcon, Sheet, moveListboxFocus } from "../../shared";
import { Exercise, WorkoutSession } from "../../../types";
import { exerciseHistory } from "../../../utils/progress";
import { formatDayMonth, today } from "../../../utils/date";
import "./ExercisePicker.css";

interface ExercisePickerProps {
  /** Already sorted by name. */
  exercises: Exercise[];
  sessions: WorkoutSession[];
  selected: string;
  onPick: (name: string) => void;
  onClose: () => void;
}

function historyText({ count, lastDate }: ReturnType<typeof exerciseHistory>, todayStr: string) {
  if (!lastDate) return "No sessions yet";
  return `${count} session${count === 1 ? "" : "s"} · last ${formatDayMonth(lastDate, todayStr)}`;
}

/**
 * A full-screen search over the exercises. Typing filters by name; Down moves
 * from the field into the list, where arrows move and Enter or Space picks.
 */
export function ExercisePicker({ exercises, sessions, selected, onPick, onClose }: ExercisePickerProps) {
  const names = exercises.map((ex) => ex.name);
  const history = useMemo(
    () => new Map(exercises.map((ex) => [ex.name, exerciseHistory(sessions, ex)])),
    [exercises, sessions],
  );
  const titleId = useId();
  const listId = useId();
  const countId = useId();
  const [query, setQuery] = useState("");
  const todayStr = today();
  const needle = query.trim().toLowerCase();
  const matches = needle ? names.filter((n) => n.toLowerCase().includes(needle)) : names;
  // One Tab stop in the list: the chosen exercise when it is shown, else the first match.
  const tabStop = matches.includes(selected) ? selected : matches[0];

  const intoList = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "ArrowDown") return;
    e.preventDefault();
    document.getElementById(listId)?.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
  };

  return (
    <Sheet full labelledBy={titleId} onClose={onClose}>
      <h2 id={titleId} className="visuallyHidden">
        Pick an exercise
      </h2>
      <div className="exercisePicker__head">
        <label className="exercisePicker__field">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="exercisePicker__icon">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" />
          </svg>
          <input
            type="search"
            aria-label="Search exercises"
            aria-controls={matches.length > 0 ? listId : undefined}
            aria-describedby={countId}
            autoComplete="off"
            spellCheck={false}
            data-autofocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={intoList}
          />
        </label>
        <button type="button" className="sheet__cancel exercisePicker__close" onClick={onClose}>
          Close
        </button>
      </div>
      <p id={countId} className="exercisePicker__count" aria-live="polite">
        {matches.length === names.length
          ? `${names.length} exercise${names.length === 1 ? "" : "s"}`
          : `${matches.length} of ${names.length} exercises`}
      </p>
      {matches.length === 0 ? (
        <p className="exercisePicker__none">No exercise matches “{query.trim()}”.</p>
      ) : (
        <div
          id={listId}
          role="listbox"
          aria-labelledby={titleId}
          className="exercisePicker__list"
          onKeyDown={moveListboxFocus}
        >
          {matches.map((name) => {
            const isSelected = name === selected;
            return (
              <button
                key={name}
                type="button"
                role="option"
                aria-selected={isSelected}
                tabIndex={name === tabStop ? 0 : -1}
                className="exercisePicker__option"
                onClick={() => onPick(name)}
              >
                <span className="exercisePicker__text">
                  <span className="exercisePicker__name">{name}</span>
                  <span className="exercisePicker__meta">{historyText(history.get(name)!, todayStr)}</span>
                </span>
                {isSelected && <CheckIcon />}
              </button>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}

export default ExercisePicker;
