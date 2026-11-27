import { useId, useState } from "react";
import { Icon, SecondaryButton, Sheet } from "../../shared";
import {
  dayBefore,
  formatDateMeta,
  formatDayMonthYear,
  maskDayMonthYear,
  parseDayMonthYear,
  today,
} from "../../../utils/date";
import Calendar from "./Calendar";
import "./DateSheet.css";

const EARLIEST = "2000-01-01";

interface DateSheetProps {
  value: string;
  onChange: (date: string) => void;
  onClose: () => void;
}

/** Why a fully typed date is refused, or null when it can be used. */
const refusal = (iso: string | null, latest: string): string | null => {
  if (!iso) return "That date doesn't exist.";
  if (iso > latest) return "That's in the future. Pick today or earlier.";
  if (iso < EARLIEST) return "Pick a date from 2000 on.";
  return null;
};

/**
 * Today, Yesterday or a calendar day pick and close; a date typed as DD/MM/YYYY
 * applies once it is complete and valid, Close ends. Dates before 2000 or in the
 * future are refused.
 */
export function DateSheet({ value, onChange, onClose }: DateSheetProps) {
  const titleId = useId();
  const otherId = useId();
  const errorId = useId();
  const todayStr = today();
  const quick = [
    { label: "Today", date: todayStr },
    { label: "Yesterday", date: dayBefore(todayStr) },
  ];
  const isQuick = quick.some((q) => q.date === value);
  const [typed, setTyped] = useState(isQuick ? "" : formatDayMonthYear(value));
  const [error, setError] = useState<string | null>(null);

  const pick = (date: string) => {
    onChange(date);
    onClose();
  };

  const retype = (text: string) => {
    const next = maskDayMonthYear(text, typed);
    setTyped(next);
    if (next.length < 10) {
      setError(null);
      return;
    }
    const iso = parseDayMonthYear(next);
    const why = refusal(iso, todayStr);
    setError(why);
    if (iso && !why) onChange(iso);
  };

  return (
    <Sheet labelledBy={titleId} onClose={onClose}>
      <h2 id={titleId} className="sheet__title">
        Session date
      </h2>
      <div className="dateSheet__quick">
        {quick.map((q) => {
          const pressed = q.date === value;
          return (
            <button
              key={q.label}
              type="button"
              aria-pressed={pressed}
              data-autofocus={pressed || undefined}
              className="dateSheet__option"
              onClick={() => pick(q.date)}
            >
              <span className="dateSheet__text">
                <span className="dateSheet__label">{q.label}</span>
                <span className="dateSheet__date">{formatDateMeta(q.date)}</span>
              </span>
              {pressed && <Icon name="check" />}
            </button>
          );
        })}
      </div>
      <div className="dateSheet__other">
        <label htmlFor={otherId} className="dateSheet__otherLabel">
          Another day
        </label>
        <input
          id={otherId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          enterKeyHint="done"
          placeholder="DD/MM/YYYY"
          maxLength={10}
          className="dateSheet__input"
          value={typed}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(e) => retype(e.target.value)}
          // Enter, "Done" on a phone keyboard, closes once the typed date is in use. Its
          // default would press the date button that focus returns to and reopen the sheet.
          onKeyDown={(e) => {
            if (e.key !== "Enter" || typed.length < 10 || error) return;
            e.preventDefault();
            onClose();
          }}
        />
        {error && (
          <p id={errorId} className="dateSheet__error" role="alert">
            {error}
          </p>
        )}
      </div>
      <Calendar key={value} value={value} min={EARLIEST} max={todayStr} onPick={pick} />
      <SecondaryButton onClick={onClose}>Close</SecondaryButton>
    </Sheet>
  );
}

export default DateSheet;
