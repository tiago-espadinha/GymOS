import { IconButton, PillButton } from "../../shared";
import { planSummary } from "../../../utils/plans";
import { TrainingPlan } from "../../../types";
import "./PlanCard.css";

interface PlanCardProps {
  plan: TrainingPlan;
  onOpen: (plan: TrainingPlan) => void;
  onStart: (plan: TrainingPlan) => void;
  onMore: (plan: TrainingPlan) => void;
}

/** An active plan: name and mix (which open its overview), Start, and ⋯ for the plan's actions. */
export function PlanCard({ plan, onOpen, onStart, onMore }: PlanCardProps) {
  return (
    <li className="planRow">
      <button type="button" className="planRow__text planRow__open" data-plan-open={plan.id} onClick={() => onOpen(plan)}>
        <span className="planRow__name">{plan.name}</span>
        <span className="planRow__meta">{planSummary(plan)}</span>
      </button>
      <PillButton variant="accent" onClick={() => onStart(plan)} aria-label={`Start ${plan.name}`}>
        Start
      </PillButton>
      <IconButton
        icon="more"
        data-plan-actions={plan.id}
        aria-label={`More actions for ${plan.name}`}
        aria-haspopup="dialog"
        onClick={() => onMore(plan)}
      />
    </li>
  );
}

export default PlanCard;
