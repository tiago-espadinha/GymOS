import { useState } from 'react';
import { Button } from '../../shared';
import CreatePlanForm from '../CreatePlanForm';
import PlanCard from '../PlanCard';
import { TrainingPlan } from '../../../types';
import './PlansTab.css';

interface PlansTabProps {
  plans: TrainingPlan[];
  setPlans: (plans: TrainingPlan[]) => void;
  onLogPlan: (plan: TrainingPlan) => void;
}

export function PlansTab({ plans, setPlans, onLogPlan }: PlansTabProps) {
  const [creating, setCreating] = useState(false);

  const savePlan = (p: TrainingPlan) => {
    setPlans([...plans, p]);
    setCreating(false);
  };

  const deletePlan = (id: string) => {
    if (window.confirm('Delete this plan?')) {
      setPlans(plans.filter((p) => p.id !== id));
    }
  };

  return (
    <div className="plansTab">
      <div className="plansTabHeader">
        <div>
          <div className="plansTabTitle">Training Plans</div>
          <div className="plansTabSubtitle">
            {plans.length} plan{plans.length !== 1 ? 's' : ''} configured
          </div>
        </div>
        {!creating && <Button onClick={() => setCreating(true)}>+ New Plan</Button>}
      </div>

      {creating && <CreatePlanForm onSave={savePlan} onCancel={() => setCreating(false)} />}

      {plans.length === 0 && !creating ? (
        <div className="plansTabEmpty">
          <div className="plansTabEmptyIcon">◈</div>
          <div className="plansTabEmptyTitle">No training plans yet</div>
          <div className="plansTabEmptyDescription">
            Create your first plan to start tracking your progress
          </div>
        </div>
      ) : (
        <div className="plansTabGrid">
          {plans.map((p) => (
            <PlanCard key={p.id} plan={p} onDelete={deletePlan} onLog={onLogPlan} />
          ))}
        </div>
      )}
    </div>
  );
}

export default PlansTab;
