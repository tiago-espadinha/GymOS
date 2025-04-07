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
        <div>
          <div className="plansTabTitle">Training Plans</div>
          <div className="plansTabSubtitle">
            {activePlans.length} active plan{activePlans.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {archivedPlans.length > 0 && (
            <Button variant="ghost" small onClick={() => setShowArchived(!showArchived)}>
              {showArchived ? 'Hide' : 'Show'} Archived ({archivedPlans.length})
            </Button>
          )}
          {!creating && <Button onClick={() => setCreating(true)}>+ New Plan</Button>}
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
          <div className="plansTabGrid">
            {activePlans.map((p) => (
              <PlanCard
                key={p.id}
                plan={p}
                onDelete={deletePlan}
                onLog={onLogPlan}
                onToggleArchive={toggleArchive}
              />
            ))}
          </div>

          {showArchived && archivedPlans.length > 0 && (
            <div className="archivedSection">
              <div className="archivedHeader">Archived Plans</div>
              <div className="plansTabGrid">
                {archivedPlans.map((p) => (
                  <PlanCard
                    key={p.id}
                    plan={p}
                    onDelete={deletePlan}
                    onLog={onLogPlan}
                    onToggleArchive={toggleArchive}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default PlansTab;
