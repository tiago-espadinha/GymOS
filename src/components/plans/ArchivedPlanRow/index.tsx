import { PillButton } from "../../shared";
import { archivedSummary } from "../../../utils/plans";
import { TrainingPlan } from "../../../types";
import "../PlanCard/PlanCard.css";

interface ArchivedPlanRowProps {
  plan: TrainingPlan;
  today: string;
  onRestore: (plan: TrainingPlan) => void;
  onDelete: (plan: TrainingPlan) => void;
}

/** An archived plan: no Start; Restore, or Delete after a confirmation. */
export function ArchivedPlanRow({ plan, today, onRestore, onDelete }: ArchivedPlanRowProps) {
  return (
    <li className="planRow planRow--archived">
      <span className="planRow__text">
        <span className="planRow__name">{plan.name}</span>
        <span className="planRow__meta">{archivedSummary(plan, today)}</span>
      </span>
      <PillButton variant="outline-white" size="compact" onClick={() => onRestore(plan)} aria-label={`Restore ${plan.name}`}>
        Restore
      </PillButton>
      <PillButton variant="outline-danger" size="compact" onClick={() => onDelete(plan)} aria-label={`Delete ${plan.name}`}>
        Delete
      </PillButton>
    </li>
  );
}

export default ArchivedPlanRow;
