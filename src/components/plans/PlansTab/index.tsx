import { useEffect, useId, useRef, useState } from 'react';
import { PillButton, PrimaryButton, Toast } from '../../shared';
import CreatePlanForm from '../CreatePlanForm';
import PlanCard from '../PlanCard';
import ArchivedPlanRow from '../ArchivedPlanRow';
import PlanActionsSheet from '../PlanActionsSheet';
import DeletePlanSheet from '../DeletePlanSheet';
import { archivePlan, deletePlan, plansCountLabel, restorePlan } from '../../../utils/plans';
import { today } from '../../../utils/date';
import { TrainingPlan, WorkoutSession } from '../../../types';
import './PlansTab.css';

interface PlansTabProps {
  plans: TrainingPlan[];
  sessions: WorkoutSession[];
  setPlans: (plans: TrainingPlan[]) => void;
  onStartPlan: (plan: TrainingPlan) => void;
  /** Opens Import and export. */
  onImport: () => void;
}

type Overlay = { kind: 'actions' | 'delete'; plan: TrainingPlan } | null;

export function PlansTab({ plans, sessions, setPlans, onStartPlan, onImport }: PlansTabProps) {
  const [creating, setCreating] = useState(false);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [archived, setArchived] = useState<TrainingPlan | null>(null);
  const root = useRef<HTMLDivElement>(null);
  // Where focus goes after the next render, when the control that had it is gone.
  const focusNext = useRef<string | null>(null);
  const archivedListId = useId();
  const emptyTitleId = useId();
  const todayStr = today();

  // Runs after a sheet has closed and the page is no longer inert.
  useEffect(() => {
    if (!focusNext.current) return;
    root.current?.querySelector<HTMLElement>(focusNext.current)?.focus();
    focusNext.current = null;
  });

  const activePlans = plans.filter((p) => !p.isArchived);
  const archivedPlans = plans.filter((p) => p.isArchived);

  const savePlan = (p: TrainingPlan) => {
    setPlans([...plans, p]);
    setCreating(false);
  };

  const archive = (plan: TrainingPlan) => {
    setPlans(archivePlan(plans, plan.id, todayStr));
    setOverlay(null);
    setArchived(plan);
    focusNext.current = '.toast__action';
  };

  const restore = (plan: TrainingPlan) => {
    setPlans(restorePlan(plans, plan.id));
    setArchived((a) => (a?.id === plan.id ? null : a));
    focusNext.current = `[data-plan-actions="${CSS.escape(plan.id)}"]`;
  };

  const remove = (plan: TrainingPlan) => {
    setPlans(deletePlan(plans, plan.id));
    setOverlay(null);
    setArchived((a) => (a?.id === plan.id ? null : a));
    focusNext.current = archivedPlans.length > 1 ? '.archivedToggle' : '.plansTabTitle';
  };

  const showEmpty = activePlans.length === 0 && !creating;

  return (
    <div className="plansTab" ref={root}>
      <header className="plansTabHeader">
        <div className="plansTabHeading">
          <span className="plansTabCount">{plansCountLabel(activePlans.length, archivedPlans.length)}</span>
          <h1 className="plansTabTitle" tabIndex={-1}>Plans</h1>
        </div>
        {!creating && !showEmpty && (
          <PillButton variant="white" onClick={() => setCreating(true)}>+ New plan</PillButton>
        )}
      </header>

      {creating && <CreatePlanForm onSave={savePlan} onCancel={() => setCreating(false)} />}

      {showEmpty ? (
        <section className="plansEmpty" aria-labelledby={emptyTitleId}>
          <h2 id={emptyTitleId} className="plansEmptyTitle">No training plans yet</h2>
          <p className="plansEmptyText">
            A plan is the list of exercises you repeat. Make one, then start it from here or from Log.
          </p>
          <PrimaryButton tone="lime" onClick={() => setCreating(true)}>+ New plan</PrimaryButton>
          <button type="button" className="textLink plansEmptyImport" onClick={onImport}>
            Have a CSV backup? Import it
          </button>
        </section>
      ) : (
        <ul className="plansTabList" role="list">
          {activePlans.map((p) => (
            <PlanCard key={p.id} plan={p} onStart={onStartPlan} onMore={(plan) => setOverlay({ kind: 'actions', plan })} />
          ))}
        </ul>
      )}

      {archivedPlans.length > 0 && (
        <section className="archivedSection">
          <button
            type="button"
            className="archivedToggle"
            aria-expanded={archivedOpen}
            aria-controls={archivedListId}
            onClick={() => setArchivedOpen(!archivedOpen)}
          >
            <span>Archived · {archivedPlans.length}</span>
            <svg className="archivedChevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          <ul id={archivedListId} className="plansTabList" role="list" hidden={!archivedOpen}>
            {archivedPlans.map((p) => (
              <ArchivedPlanRow key={p.id} plan={p} today={todayStr} onRestore={restore}
                onDelete={(plan) => setOverlay({ kind: 'delete', plan })} />
            ))}
          </ul>
        </section>
      )}

      {overlay?.kind === 'actions' && (
        <PlanActionsSheet plan={overlay.plan} sessions={sessions} today={todayStr} onArchive={archive}
          onClose={() => setOverlay(null)} />
      )}
      {overlay?.kind === 'delete' && (
        <DeletePlanSheet plan={overlay.plan} onDelete={remove} onClose={() => setOverlay(null)} />
      )}

      {archived && (
        <Toast message={`${archived.name} archived`} actionLabel="Undo" onAction={() => restore(archived)}
          onDismiss={() => setArchived(null)} />
      )}
    </div>
  );
}

export default PlansTab;
