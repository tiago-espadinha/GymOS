import { Button, Badge } from '../../shared';
import { MUSCLE_GROUP_COLORS } from '../../../constants/muscleGroups';
import { TrainingPlan } from '../../../types';
import './PlanCard.css';

interface PlanCardProps {
  plan: TrainingPlan;
  onDelete: (id: string) => void;
  onLog: (plan: TrainingPlan) => void;
}

export function PlanCard({ plan, onDelete, onLog }: PlanCardProps) {
  return (
    <div className="planCard">
      <div className="planCardHeader">
        <div>
          <div className="planCardName">{plan.name}</div>
          {plan.desc && <div className="planCardDesc">{plan.desc}</div>}
        </div>
        <div className="planCardActions">
          <Button onClick={() => onLog(plan)} small>
            Log
          </Button>
          <button onClick={() => onDelete(plan.id)} className="planCardDelete">
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
        {plan.exercises.length} exercise{plan.exercises.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

export default PlanCard;
