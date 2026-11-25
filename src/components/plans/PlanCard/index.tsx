import { PillButton } from "../../shared";
import { planSummary } from "../../../utils/plans";
import { TrainingPlan } from "../../../types";
import "./PlanCard.css";

interface PlanCardProps {
  plan: TrainingPlan;
  onStart: (plan: TrainingPlan) => void;
  onMore: (plan: TrainingPlan) => void;
}

/** An active plan: name and mix on one line each, Start, and ⋯ for the plan's actions. */
export function PlanCard({ plan, onStart, onMore }: PlanCardProps) {
  return (
    <li className="planRow">
      <span className="planRow__text">
        <span className="planRow__name">{plan.name}</span>
        <span className="planRow__meta">{planSummary(plan)}</span>
      </span>
      <PillButton variant="accent" onClick={() => onStart(plan)} aria-label={`Start ${plan.name}`}>
        Start
      </PillButton>
      <button
        type="button"
        className="planRow__more"
        data-plan-actions={plan.id}
        aria-label={`More actions for ${plan.name}`}
        aria-haspopup="dialog"
        onClick={() => onMore(plan)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>
    </li>
  );
}

export default PlanCard;
