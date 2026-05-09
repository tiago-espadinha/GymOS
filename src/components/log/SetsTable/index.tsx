import { Set } from "../../../types";
import { isLoggedSet } from "../../../utils/activeSession";
import "./SetsTable.css";

interface SetsTableProps {
  sets: Set[];
  /** The set being entered; equal to sets.length when it is the virtual next set. */
  currentIndex: number;
  /** The draft's values, shown on the current row and on rows still to come. */
  draftLabel: string;
  /** The set being edited and its new values. */
  editing: { index: number; label: string } | null;
  format: (set: Set) => string;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
}

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12l5 5L20 6" />
  </svg>
);

const CrossIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

// Logged sets with Edit, the current one inverted with NOW, sets still to come with ✕.
export function SetsTable({ sets, currentIndex, draftLabel, editing, format, onEdit, onRemove }: SetsTableProps) {
  const rows = currentIndex === sets.length ? [...sets, null] : sets;

  return (
    <ol className="setsTable" aria-label="Sets" tabIndex={-1}>
      {rows.map((set, i) => {
        const n = i + 1;
        if (editing?.index === i && set) {
          return (
            <li key={set.id} className="setsTableRow setsTableRow--inverted" aria-current="step">
              <span className="setsTableLabel">Set {n}</span>
              <span className="setsTableValues">
                {format(set)} → {editing.label}
              </span>
              <span className="setsTableTag">Editing</span>
            </li>
          );
        }
        if (set && isLoggedSet(set)) {
          return (
            <li key={set.id} className="setsTableRow">
              <span className="setsTableLabel">Set {n}</span>
              <span className="setsTableValues setsTableValues--done">
                <CheckIcon />
                {format(set)}
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
              <span className="setsTableLabel">Set {n}</span>
              <span className="setsTableValues">{draftLabel}</span>
              <span className="setsTableTag">Now</span>
            </li>
          );
        }
        return (
          <li key={set?.id ?? "next"} className="setsTableRow setsTableRow--pending">
            <span className="setsTableLabel">Set {n}</span>
            <span className="setsTableValues">{draftLabel}</span>
            {set && !editing && (
              <button type="button" className="setsTableRemove" aria-label={`Remove set ${n}`} onClick={() => onRemove(i)}>
                <CrossIcon />
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default SetsTable;
