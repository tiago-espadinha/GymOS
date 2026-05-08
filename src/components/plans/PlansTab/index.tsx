import { useState } from 'react';
import { PillButton } from '../../shared';
import CreatePlanForm from '../CreatePlanForm';
import PlanCard from '../PlanCard';
import { TrainingPlan } from '../../../types';
import './PlansTab.css';

interface PlansTabProps {
  plans: TrainingPlan[];
  setPlans: (plans: TrainingPlan[]) => void;
  onStartPlan: (plan: TrainingPlan) => void;
}

export function PlansTab({ plans, setPlans, onStartPlan }: PlansTabProps) {
  const [creating, setCreating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const savePlan = (p: TrainingPlan) => {
    setPlans([...plans, p]);
    setCreating(false);
  };

  const deletePlan = (id: string) => {
    if (window.confirm('Delete this plan permanently?')) {
      setPlans(plans.filter((p) => p.id !== id));
    }
  };

  const toggleArchive = (id: string) => {
    setPlans(
      plans.map((p) => (p.id === id ? { ...p, isArchived: !p.isArchived } : p))
    );
  };

  const activePlans = plans.filter((p) => !p.isArchived);
  const archivedPlans = plans.filter((p) => p.isArchived);

  return (
    <div className="plansTab">
      <div className="plansTabHeader">
        <h1 className="plansTabTitle">Plans</h1>
        <div className="plansTabActions">
          {archivedPlans.length > 0 && (
            <PillButton variant="outline-white" onClick={() => setShowArchived(!showArchived)}>
              {showArchived ? 'Hide' : 'Show'} archived ({archivedPlans.length})
            </PillButton>
          )}
          {!creating && <PillButton variant="white" onClick={() => setCreating(true)}>+ New plan</PillButton>}
        </div>
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
        <>
          <ul className="plansTabList" role="list">
            {activePlans.map((p) => (
              <PlanCard
                key={p.id}
                plan={p}
                onDelete={deletePlan}
                onStart={onStartPlan}
                onToggleArchive={toggleArchive}
              />
            ))}
          </ul>

          {showArchived && archivedPlans.length > 0 && (
            <div className="archivedSection">
              <h2 className="archivedHeader">Archived plans</h2>
              <ul className="plansTabList" role="list">
                {archivedPlans.map((p) => (
                  <PlanCard
                    key={p.id}
                    plan={p}
                    onDelete={deletePlan}
                    onStart={onStartPlan}
                    onToggleArchive={toggleArchive}
                  />
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default PlansTab;
