import { Icon } from "../../shared";
import { planSummary } from "../../../utils/plans";
import { TrainingPlan } from "../../../types";
import "../PlanCard/PlanCard.css";
import "./PlanSelectRow.css";

interface PlanSelectRowProps {
  plan: TrainingPlan;
  selected: boolean;
  /** The detail pane this row fills. */
  controls: string;
  onSelect: (plan: TrainingPlan) => void;
}

/** An active plan in wide Plans' left pane: picking it shows it on the right. */
export function PlanSelectRow({ plan, selected, controls, onSelect }: PlanSelectRowProps) {
  return (
    <li className="planSelect">
      <button
        type="button"
        className="planSelect__button"
        aria-current={selected || undefined}
        aria-controls={controls}
        onClick={() => onSelect(plan)}
      >
        <span className="planRow__text">
          <span className="planRow__name">{plan.name}</span>
          <span className="planRow__meta">{planSummary(plan)}</span>
        </span>
        {selected && <Icon name="check" />}
      </button>
    </li>
  );
}

export default PlanSelectRow;
