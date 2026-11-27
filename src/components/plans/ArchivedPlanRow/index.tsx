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

// No-break spaces: a wrapped line splits neither "12 Oct" nor "1 exercise", nor starts on the dot.
const keepTogether = (summary: string) => summary.replace(/(\d) | (?=·)/g, "$1\u00a0");

/** An archived plan: no Start; Restore, or Delete after a confirmation. */
export function ArchivedPlanRow({ plan, today, onRestore, onDelete }: ArchivedPlanRowProps) {
  return (
    <li className="planRow planRow--archived">
      <span className="planRow__text">
        <span className="planRow__name">{plan.name}</span>
        <span className="planRow__meta">{keepTogether(archivedSummary(plan, today))}</span>
      </span>
      <span className="planRow__actions">
        <PillButton variant="outline-white" onClick={() => onRestore(plan)} aria-label={`Restore ${plan.name}`}>
          Restore
        </PillButton>
        <PillButton variant="outline-danger" onClick={() => onDelete(plan)} aria-label={`Delete ${plan.name}`}>
          Delete
        </PillButton>
      </span>
    </li>
  );
}

export default ArchivedPlanRow;
