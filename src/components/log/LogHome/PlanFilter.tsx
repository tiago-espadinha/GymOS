import { useState } from "react";
import { Icon, ListboxSheet } from "../../shared";

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

/**
 * The Recent filter: an icon button that opens a full-screen listbox of plans, the
 * same pattern as Pick a plan. "All plans" heads the list and clears the filter.
 * With a filter on, the button fills with the accent and names the plan.
 */
export function PlanFilter({ plans, total, value, onChange }: PlanFilterProps) {
  const [open, setOpen] = useState(false);
  const active = plans.find((p) => p.key === value);
  const options = [{ key: ALL, name: "All plans", count: total }, ...plans].map((p) => ({
    key: p.key,
    name: p.name,
    meta: sessionsLabel(p.count),
  }));

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
        <Icon name="filter" size="md" />
        {active && (
          <span className="logHomeFilterName">{active.name}</span>
        )}
      </button>
      {open && (
        <ListboxSheet
          title="Filter by plan"
          options={options}
          selectedKey={value}
          onPick={pick}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

export default PlanFilter;
