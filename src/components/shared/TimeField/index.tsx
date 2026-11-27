import { useState } from "react";
import { formatClock } from "../../../hooks/useTimer";
import { timeSeconds, typedTime } from "../../../utils/timeField";
import "./TimeField.css";

interface TimeFieldProps {
  label: string;
  seconds: number;
  /** The typed time, once the field is left or Enter is pressed; also when it matches the old one. */
  onCommit: (seconds: number) => void;
  autoFocus?: boolean;
  className?: string;
}

/**
 * A duration typed as digits that fill from the right. Nothing changes until the
 * field is left, so a half-typed time never reaches a running timer; empty or
 * zero keeps the old one.
 */
export function TimeField({ label, seconds, onCommit, autoFocus, className = "" }: TimeFieldProps) {
  // The text while typing; null shows the current time.
  const [text, setText] = useState<string | null>(null);
  const commit = () => {
    const typed = text === null ? 0 : timeSeconds(text);
    setText(null);
    if (typed > 0) onCommit(typed);
  };
  return (
    <input
      className={`timeField ${className}`}
      aria-label={label}
      inputMode="numeric"
      enterKeyHint="done"
      placeholder="00:00"
      autoFocus={autoFocus}
      value={text ?? formatClock(seconds * 1000)}
      onChange={(e) => setText(typedTime(e.target.value))}
      onFocus={(e) => e.target.select()}
      // As in the set fields: every tap selects the whole time, and Safari would undo it on mouseup.
      onClick={(e) => e.currentTarget.select()}
      onMouseUp={(e) => e.preventDefault()}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
    />
  );
}

export default TimeField;
