import { useId } from "react";
import { Sheet } from "../../shared";
import { planActionsSummary } from "../../../utils/plans";
import { TrainingPlan, WorkoutSession } from "../../../types";
import "./PlanActionsSheet.css";

interface PlanActionsSheetProps {
  plan: TrainingPlan;
  sessions: WorkoutSession[];
  today: string;
  onArchive: (plan: TrainingPlan) => void;
  onClose: () => void;
}

/** The ⋯ sheet of an active plan. Active plans can only be archived; delete lives in Archived. */
export function PlanActionsSheet({ plan, sessions, today, onArchive, onClose }: PlanActionsSheetProps) {
  const titleId = useId();
  return (
    <Sheet labelledBy={titleId} onClose={onClose}>
      <div className="planActions__head">
        <span className="sheet__kicker">Plan</span>
        <h2 id={titleId} className="sheet__title">{plan.name}</h2>
        <span className="planActions__meta">{planActionsSummary(plan, sessions, today)}</span>
      </div>
      <button type="button" className="planActions__archive" onClick={() => onArchive(plan)}>
        <span className="planActions__archiveLabel">Archive plan</span>
        <span className="planActions__archiveHint">Hides it from Plans and Log. Restore it from Archived.</span>
      </button>
      <button type="button" className="sheet__cancel" onClick={onClose}>
        Cancel
      </button>
    </Sheet>
  );
}

export default PlanActionsSheet;
