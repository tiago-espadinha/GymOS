import { ListRow, PillButton } from "../../shared";
import { planSummary } from "../../../utils/plans";
import { TrainingPlan } from "../../../types";
import "./PlanCard.css";

interface PlanCardProps {
  plan: TrainingPlan;
  onDelete: (id: string) => void;
  onStart: (plan: TrainingPlan) => void;
  onToggleArchive: (id: string) => void;
}

export function PlanCard({ plan, onDelete, onStart, onToggleArchive }: PlanCardProps) {
  const subtitle = [plan.isArchived ? "Archived" : "", plan.desc, planSummary(plan)]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className={`planCard${plan.isArchived ? " isArchived" : ""}`}>
      <ListRow
        title={plan.name}
        subtitle={subtitle}
        trailing={
          !plan.isArchived && (
            <PillButton variant="lime" onClick={() => onStart(plan)} aria-label={`Start ${plan.name}`}>
              Start
            </PillButton>
          )
        }
      />
      <div className="planCardActions">
        <PillButton
          variant="outline-white"
          onClick={() => onToggleArchive(plan.id)}
          aria-label={`${plan.isArchived ? "Restore" : "Archive"} ${plan.name}`}
        >
          {plan.isArchived ? "Restore" : "Archive"}
        </PillButton>
        <PillButton variant="outline-white" onClick={() => onDelete(plan.id)} aria-label={`Delete ${plan.name}`}>
          Delete
        </PillButton>
      </div>
    </li>
  );
}

export default PlanCard;
