import { useId, useState } from "react";
import { CheckIcon, Sheet, moveListboxFocus } from "../../shared";
import "../PlanPicker/PlanPicker.css";

export const ALL = "all";

interface PlanOption {
  key: string;
  name: string;
  /** Sessions saved under this plan. */
  count: number;
}

interface PlanFilterProps {
  /** Plans with saved sessions, archived, deleted and imported ones included. */
  plans: PlanOption[];
  total: number;
  /** A plan key, or ALL. */
  value: string;
  onChange: (key: string) => void;
}

const sessionsLabel = (n: number) => `${n} ${n === 1 ? "session" : "sessions"}`;

function FilterIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M3 5h18l-7 8.5V20l-4-2v-4.5z" />
    </svg>
  );
}

/**
 * The Recent filter: an icon button that opens a full-screen listbox of plans, the
 * same pattern as Pick a plan. "All plans" heads the list and clears the filter.
 * With a filter on, the button fills with the accent and names the plan.
 */
export function PlanFilter({ plans, total, value, onChange }: PlanFilterProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const active = plans.find((p) => p.key === value);
  const options = [{ key: ALL, name: "All plans", count: total }, ...plans];

  const pick = (key: string) => {
    onChange(key);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className={active ? "logHomeFilterButton logHomeFilterButton--active" : "logHomeFilterButton"}
        aria-label={active ? `Filter by plan, ${active.name}` : "Filter by plan"}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <FilterIcon />
        {active && (
          <span className="logHomeFilterName">{active.name}</span>
        )}
      </button>
      {open && (
        <Sheet full labelledBy={titleId} onClose={() => setOpen(false)}>
          <header className="planPicker__head">
            <h2 id={titleId} className="sheet__title sheet__title--lg">
              Filter by plan
            </h2>
            <button type="button" className="sheet__cancel" onClick={() => setOpen(false)}>
              Close
            </button>
          </header>
          <div role="listbox" aria-labelledby={titleId} className="planPicker__list" onKeyDown={moveListboxFocus}>
            {options.map((option) => {
              const selected = option.key === value;
              return (
                <button
                  key={option.key}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  tabIndex={selected ? 0 : -1}
                  data-autofocus={selected || undefined}
                  className="planPicker__option"
                  onClick={() => pick(option.key)}
                >
                  <span className="planPicker__text">
                    <span className="planPicker__name">{option.name}</span>
                    <span className="planPicker__meta">{sessionsLabel(option.count)}</span>
                  </span>
                  {selected && <CheckIcon />}
                </button>
              );
            })}
          </div>
        </Sheet>
      )}
    </>
  );
}

export default PlanFilter;
