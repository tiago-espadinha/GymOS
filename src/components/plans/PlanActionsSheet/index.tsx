import { useId } from "react";
import { Sheet } from "../../shared";
import { planActionsSummary } from "../../../utils/plans";
import { TrainingPlan, WorkoutSession } from "../../../types";
import "./PlanActionsSheet.css";

interface PlanActionsSheetProps {
  plan: TrainingPlan;
  sessions: WorkoutSession[];
  today: string;
  onEdit: (plan: TrainingPlan) => void;
  onArchive: (plan: TrainingPlan) => void;
  onClose: () => void;
}

/** The ⋯ sheet of an active plan: edit or archive it. Delete lives in Archived. */
export function PlanActionsSheet({ plan, sessions, today, onEdit, onArchive, onClose }: PlanActionsSheetProps) {
  const titleId = useId();
  return (
    <Sheet labelledBy={titleId} onClose={onClose}>
      <div className="planActions__head">
        <span className="sheet__kicker">Plan</span>
        <h2 id={titleId} className="sheet__title">{plan.name}</h2>
        <span className="planActions__meta">{planActionsSummary(plan, sessions, today)}</span>
      </div>
      <button type="button" className="planActions__row planActions__row--edit" onClick={() => onEdit(plan)}>
        <span className="planActions__label">Edit plan</span>
        <span className="planActions__hint">Name, description and exercises.</span>
      </button>
      <button type="button" className="planActions__row" onClick={() => onArchive(plan)}>
        <span className="planActions__label">Archive plan</span>
        <span className="planActions__hint">Hides it from Plans and Log. Restore it from Archived.</span>
      </button>
      <button type="button" className="sheet__cancel" onClick={onClose}>
        Cancel
      </button>
    </Sheet>
  );
}

export default PlanActionsSheet;
