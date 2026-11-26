import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Icon, type IconName } from "../../shared";
import { addDays, addMonths, formatDateSpoken, formatMonthYear, monthWeeks } from "../../../utils/date";

/** A month touches at most six Monday-first weeks. */
const MAX_WEEKS = 6;
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface CalendarProps {
  /** The chosen ISO date; remount (key) to show another one. */
  value: string;
  /** Earliest and latest ISO dates that can be picked; latest is today. */
  min: string;
  max: string;
  onPick: (date: string) => void;
}

const clamp = (d: string, min: string, max: string) => (d < min ? min : d > max ? max : d);

/**
 * A month of days, Monday first, as an ARIA grid with one tab stop. Arrows move a day
 * or a week, Home and End to the week's ends, Page Up and Page Down a month (with Shift
 * a year). Focus never leaves min to max, so days outside it are shown but never picked.
 */
export function Calendar({ value, min, max, onPick }: CalendarProps) {
  const monthId = useId();
  const [focused, setFocused] = useState(() => clamp(value, min, max));
  const moveFocus = useRef(false);
  const grid = useRef<HTMLTableElement>(null);

  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    grid.current?.querySelector<HTMLElement>('button[tabindex="0"]')?.focus();
  }, [focused]);

  // A key that moves nothing must not leave the flag set for a later re-render.
  const go = (date: string, focus: boolean) => {
    const next = clamp(date, min, max);
    if (next === focused) return;
    moveFocus.current = focus;
    setFocused(next);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTableElement>) => {
    const weekday = (new Date(focused + "T12:00:00Z").getUTCDay() + 6) % 7;
    const steps: Record<string, () => string> = {
      ArrowLeft: () => addDays(focused, -1),
      ArrowRight: () => addDays(focused, 1),
      ArrowUp: () => addDays(focused, -7),
      ArrowDown: () => addDays(focused, 7),
      Home: () => addDays(focused, -weekday),
      End: () => addDays(focused, 6 - weekday),
      PageUp: () => addMonths(focused, e.shiftKey ? -12 : -1),
      PageDown: () => addMonths(focused, e.shiftKey ? 12 : 1),
    };
    const step = steps[e.key];
    if (!step) return;
    e.preventDefault();
    go(step(), true);
  };

  const month = focused.slice(0, 7);
  const weeks = monthWeeks(focused);

  return (
    <div className="calendar">
      <div className="calendar__head">
        <MonthStep
          label="Previous month"
          icon="chevron-left"
          blocked={month <= min.slice(0, 7)}
          onStep={() => go(addMonths(focused, -1), false)}
        />
        <h3 id={monthId} className="calendar__month" aria-live="polite">
          {formatMonthYear(focused)}
        </h3>
        <MonthStep
          label="Next month"
          icon="chevron-right"
          blocked={month >= max.slice(0, 7)}
          onStep={() => go(addMonths(focused, 1), false)}
        />
      </div>
      <table ref={grid} role="grid" className="calendar__grid" aria-labelledby={monthId} onKeyDown={onKeyDown}>
        <thead>
          <tr>
            {WEEKDAYS.map((day) => (
              <th key={day} scope="col" abbr={day} className="calendar__weekday">
                {day.slice(0, 1)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, w) => (
            <tr key={`${month}-${w}`}>
              {week.map((date, d) =>
                date ? (
                  <Day
                    key={date}
                    date={date}
                    chosen={date === value}
                    focused={date === focused}
                    today={date === max}
                    outside={date < min || date > max}
                    onPick={onPick}
                    onFocus={() => setFocused(clamp(date, min, max))}
                  />
                ) : (
                  <td key={`empty-${d}`} role="gridcell" />
                ),
              )}
            </tr>
          ))}
          {/* Every month takes six rows of space, so the sheet and its buttons never move. */}
          {Array.from({ length: MAX_WEEKS - weeks.length }, (_, i) => (
            <tr key={`pad-${i}`} className="calendar__pad" aria-hidden="true">
              <td colSpan={7} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface DayProps {
  date: string;
  chosen: boolean;
  focused: boolean;
  today: boolean;
  outside: boolean;
  onPick: (date: string) => void;
  onFocus: () => void;
}

function Day({ date, chosen, focused, today, outside, onPick, onFocus }: DayProps) {
  return (
    <td role="gridcell" aria-selected={chosen}>
      <button
        type="button"
        className="calendar__day"
        tabIndex={focused ? 0 : -1}
        aria-label={formatDateSpoken(date)}
        aria-current={today ? "date" : undefined}
        aria-disabled={outside || undefined}
        data-autofocus={(chosen && focused) || undefined}
        onClick={() => !outside && onPick(date)}
        onFocus={onFocus}
      >
        {Number(date.slice(8))}
      </button>
    </td>
  );
}

/** aria-disabled, not disabled: a focused button that becomes disabled drops focus to the page. */
function MonthStep({ label, icon, blocked, onStep }: { label: string; icon: IconName; blocked: boolean; onStep: () => void }) {
  return (
    <button
      type="button"
      className="calendar__step"
      aria-label={label}
      aria-disabled={blocked || undefined}
      onClick={() => !blocked && onStep()}
    >
      <Icon name={icon} />
    </button>
  );
}

export default Calendar;
