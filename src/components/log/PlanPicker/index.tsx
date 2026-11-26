import { useId } from "react";
import { Icon, moveListboxFocus, Sheet } from "../../shared";
import { planTrainedSummary } from "../../../utils/plans";
import { today } from "../../../utils/date";
import { TrainingPlan, WorkoutSession } from "../../../types";
import "./PlanPicker.css";

interface PlanPickerProps {
  /** Active plans only. */
  plans: TrainingPlan[];
  sessions: WorkoutSession[];
  selectedId: string;
  /** Archived plans are not offered; a note says where to restore them. */
  hasArchived: boolean;
  onPick: (plan: TrainingPlan) => void;
  onClose: () => void;
}

/** A full-screen listbox: one Tab stop on the chosen plan, arrows move, Enter or Space picks. */
export function PlanPicker({ plans, sessions, selectedId, hasArchived, onPick, onClose }: PlanPickerProps) {
  const titleId = useId();
  const todayStr = today();
  return (
    <Sheet full labelledBy={titleId} onClose={onClose}>
      <header className="planPicker__head">
        <h2 id={titleId} className="sheet__title sheet__title--lg">
          Pick a plan
        </h2>
        <button type="button" className="sheet__cancel" onClick={onClose}>
          Close
        </button>
      </header>
      <div role="listbox" aria-labelledby={titleId} className="planPicker__list" onKeyDown={moveListboxFocus}>
        {plans.map((plan) => {
          const selected = plan.id === selectedId;
          return (
            <button
              key={plan.id}
              type="button"
              role="option"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              data-autofocus={selected || undefined}
              className="planPicker__option"
              onClick={() => onPick(plan)}
            >
              <span className="planPicker__text">
                <span className="planPicker__name">{plan.name}</span>
                <span className="planPicker__meta">{planTrainedSummary(plan, sessions, todayStr, "last")}</span>
              </span>
              {selected && <Icon name="check" />}
            </button>
          );
        })}
      </div>
      {hasArchived && <p className="planPicker__note">Archived plans aren't listed. Restore one from Plans.</p>}
    </Sheet>
  );
}

export default PlanPicker;
