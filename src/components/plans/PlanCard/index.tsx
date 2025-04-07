import { Button, Badge } from "../../shared";
import { MUSCLE_GROUP_COLORS } from "../../../constants/muscleGroups";
import { TrainingPlan } from "../../../types";
import "./PlanCard.css";

interface PlanCardProps {
  plan: TrainingPlan;
  onDelete: (id: string) => void;
  onLog: (plan: TrainingPlan) => void;
  onToggleArchive: (id: string) => void;
}

export function PlanCard({
  plan,
  onDelete,
  onLog,
  onToggleArchive,
}: PlanCardProps) {
  return (
    <div className={`planCard ${plan.isArchived ? "isArchived" : ""}`}>
      <div className="planCardHeader">
        <div>
          <div className="planCardName">
            {plan.name}
            {plan.isArchived && <span className="archivedBadge">Archived</span>}
          </div>
          {plan.desc && <div className="planCardDesc">{plan.desc}</div>}
        </div>
        <div className="planCardActions">
          {!plan.isArchived && (
            <Button onClick={() => onLog(plan)} small>
              Log
            </Button>
          )}
          <Button
            onClick={() => onToggleArchive(plan.id)}
            small
            variant={plan.isArchived ? "success" : "ghost"}
          >
            {plan.isArchived ? "Restore" : "Archive"}
          </Button>
          <button
            onClick={() => onDelete(plan.id)}
            className="planCardDelete"
            title="Delete Plan"
          >
            ×
          </button>
        </div>
      </div>

      <div className="planCardBadgeRow">
        {plan.exercises.map((ex) => (
          <Badge key={ex.id} color={MUSCLE_GROUP_COLORS[ex.muscleGroup]}>
            {ex.name}
          </Badge>
        ))}
      </div>

      <div className="planCardFooter">
        {plan.exercises.length} exercise{plan.exercises.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}

export default PlanCard;
