import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Icon, moveListboxFocus, Sheet } from "../../shared";
import { Exercise, WorkoutSession } from "../../../types";
import { exerciseHistory } from "../../../utils/progress";
import { formatDayMonth, today } from "../../../utils/date";
import "./ExercisePicker.css";

interface ExerciseSearchProps {
  /** Already sorted by name. */
  exercises: Exercise[];
  sessions: WorkoutSession[];
  selected: string;
  onPick: (name: string) => void;
  listLabel: string;
  /** In the sheet the field takes focus on open; in the wide pane it waits for a tap and the list opens at the chosen exercise. */
  autoFocus?: boolean;
  /** Beside the field, such as the sheet's Close. */
  action?: ReactNode;
  /** The wide pane's field says what it is before it is tapped. */
  placeholder?: string;
}

function historyText({ count, lastDate }: ReturnType<typeof exerciseHistory>, todayStr: string) {
  if (!lastDate) return "No sessions yet";
  return `${count} session${count === 1 ? "" : "s"} · last ${formatDayMonth(lastDate, todayStr)}`;
}

/**
 * A search over the exercises. Typing filters by name; Down moves from the
 * field into the list, where arrows move and Enter or Space picks.
 */
export function ExerciseSearch({ exercises, sessions, selected, onPick, listLabel, autoFocus, action, placeholder }: ExerciseSearchProps) {
  const names = exercises.map((ex) => ex.name);
  const history = useMemo(
    () => new Map(exercises.map((ex) => [ex.name, exerciseHistory(sessions, ex)])),
    [exercises, sessions],
  );
  const listId = useId();
  const countId = useId();
  const list = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const todayStr = today();
  const needle = query.trim().toLowerCase();
  const matches = needle ? names.filter((n) => n.toLowerCase().includes(needle)) : names;
  // One Tab stop in the list: the chosen exercise when it is shown, else the first match.
  const tabStop = matches.includes(selected) ? selected : matches[0];

  useEffect(() => {
    const chosen = list.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (autoFocus || !list.current || !chosen) return;
    list.current.scrollTop = chosen.offsetTop - list.current.clientHeight / 2 + chosen.offsetHeight / 2;
    // Once, when the list appears; picking keeps the list where the person left it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const intoList = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "ArrowDown") return;
    e.preventDefault();
    document.getElementById(listId)?.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
  };

  return (
    <>
      <div className="exercisePicker__head">
        <label className="exercisePicker__field">
          <Icon name="search" size="md" />
          <input
            type="search"
            aria-label="Search exercises"
            aria-controls={matches.length > 0 ? listId : undefined}
            aria-describedby={countId}
            autoComplete="off"
            spellCheck={false}
            placeholder={placeholder}
            data-autofocus={autoFocus || undefined}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={intoList}
          />
        </label>
        {action}
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
          ref={list}
          role="listbox"
          aria-label={listLabel}
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
                {isSelected && <Icon name="check" />}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

interface ExercisePickerProps extends Omit<ExerciseSearchProps, "listLabel" | "autoFocus" | "action" | "placeholder"> {
  onClose: () => void;
}

/** The search as a full-screen sheet, opened from the exercise name below the wide breakpoint. */
export function ExercisePicker({ onClose, ...search }: ExercisePickerProps) {
  const titleId = useId();
  return (
    <Sheet full labelledBy={titleId} onClose={onClose}>
      <h2 id={titleId} className="visuallyHidden">
        Pick an exercise
      </h2>
      <ExerciseSearch
        {...search}
        listLabel="Pick an exercise"
        autoFocus
        action={
          <button type="button" className="sheet__cancel exercisePicker__close" onClick={onClose}>
            Close
          </button>
        }
      />
    </Sheet>
  );
}

export default ExercisePicker;
