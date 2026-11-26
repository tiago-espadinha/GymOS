import { Icon } from "../../shared";
import { Set } from "../../../types";
import { isLoggedSet } from "../../../utils/activeSession";
import { NO_VALUES } from "../../../utils/sessionList";
import "./SetsTable.css";

interface SetsTableProps {
  sets: Set[];
  /** The set being entered; equal to sets.length when it is the virtual next set, -1 for none. */
  currentIndex: number;
  /** The draft's values, shown on the current row. */
  draftLabel: string;
  /** The set being edited and its new values. */
  editing: { index: number; label: string } | null;
  format: (set: Set) => string;
  /** Last time's values for the set at this position; null hides the column. */
  lastTime: ((index: number) => string) | null;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
}

// Set, last time and today side by side: logged sets with Edit, the current one
// inverted with NOW, sets still to come with ✕.
export function SetsTable({ sets, currentIndex, draftLabel, editing, format, lastTime, onEdit, onRemove }: SetsTableProps) {
  const rows = currentIndex === sets.length ? [...sets, null] : sets;

  return (
    <ol className={`setsTable${lastTime ? " setsTable--last" : ""}`} aria-label="Sets" tabIndex={-1}>
      {lastTime && (
        <li className="setsTableHead" aria-hidden="true">
          <span>Set</span>
          <span>Last</span>
          <span>Today</span>
        </li>
      )}
      {rows.map((set, i) => {
        const n = i + 1;
        const lead = (
          <>
            <span className="setsTableLabel">
              <span className="visuallyHidden">Set </span>
              {n}
            </span>
            {lastTime && (
              <span className="setsTableLast">
                <span className="visuallyHidden">Last time </span>
                {lastTime(i)}
              </span>
            )}
          </>
        );
        const today = lastTime && <span className="visuallyHidden">Today </span>;
        if (editing?.index === i && set) {
          return (
            <li key={set.id} className="setsTableRow setsTableRow--inverted" aria-current="step">
              {lead}
              <span className="setsTableValues">
                {today}→ {editing.label}
              </span>
              <span className="setsTableTag">Editing</span>
            </li>
          );
        }
        if (set && isLoggedSet(set)) {
          return (
            <li key={set.id} className="setsTableRow">
              {lead}
              <span className="setsTableValues setsTableValues--done">
                {today}
                {format(set)}
                <Icon name="check" />
              </span>
              <button type="button" className="setsTableEdit" aria-label={`Edit set ${n}`} onClick={() => onEdit(i)}>
                Edit
              </button>
            </li>
          );
        }
        if (i === currentIndex && !editing) {
          return (
            <li key={set?.id ?? "next"} className="setsTableRow setsTableRow--inverted" aria-current="step">
              {lead}
              <span className="setsTableValues">
                {today}
                {draftLabel}
              </span>
              <span className="setsTableTag">Now</span>
            </li>
          );
        }
        return (
          <li key={set?.id ?? "next"} className="setsTableRow setsTableRow--pending">
            {lead}
            <span className="setsTableValues">
              {today}
              {NO_VALUES}
            </span>
            {set && !editing && (
              <button type="button" className="setsTableRemove" aria-label={`Remove set ${n}`} onClick={() => onRemove(i)}>
                <Icon name="close" />
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default SetsTable;
