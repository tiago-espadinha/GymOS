import { useId } from "react";
import { CheckIcon, Sheet } from "../../shared";
import { dayBefore, formatDateMeta, today } from "../../../utils/date";
import "./DateSheet.css";

// A browser reports a valid date after each typed year digit (0002, 0020, 0202),
// so years before this are taken as half-typed and ignored.
const EARLIEST = "2000-01-01";

interface DateSheetProps {
  value: string;
  onChange: (date: string) => void;
  onClose: () => void;
}

/** Today and Yesterday pick and close; Another day applies as it is typed, Close ends. Dates before 2000 or in the future are refused. */
export function DateSheet({ value, onChange, onClose }: DateSheetProps) {
  const titleId = useId();
  const otherId = useId();
  const todayStr = today();
  const quick = [
    { label: "Today", date: todayStr },
    { label: "Yesterday", date: dayBefore(todayStr) },
  ];
  const isQuick = quick.some((q) => q.date === value);

  const pick = (date: string) => {
    onChange(date);
    onClose();
  };

  return (
    <Sheet labelledBy={titleId} onClose={onClose}>
      <h2 id={titleId} className="sheet__title">
        Session date
      </h2>
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
            {pressed && <CheckIcon />}
          </button>
        );
      })}
      <div className="dateSheet__other">
        <label htmlFor={otherId} className="dateSheet__otherLabel">
          Another day
        </label>
        <input
          id={otherId}
          type="date"
          className="dateSheet__input"
          min={EARLIEST}
          max={todayStr}
          defaultValue={isQuick ? "" : value}
          // Uncontrolled, so clearing a segment to retype it does not snap back.
          onChange={(e) => {
            const date = e.target.value;
            if (date >= EARLIEST && date <= todayStr) onChange(date);
          }}
        />
      </div>
      <button type="button" className="sheet__cancel" onClick={onClose}>
        Close
      </button>
    </Sheet>
  );
}

export default DateSheet;
