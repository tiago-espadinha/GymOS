import { useEffect, useId, useRef, useState } from 'react';
import { EmptyState, PillButton, Toast } from '../../shared';
import CreatePlanForm from '../CreatePlanForm';
import PlanCard from '../PlanCard';
import ArchivedPlanRow from '../ArchivedPlanRow';
import PlanActionsSheet from '../PlanActionsSheet';
import DeletePlanSheet from '../DeletePlanSheet';
import PlanDetail from '../PlanDetail';
import PlanSelectRow from '../PlanSelectRow';
import { useMediaQuery, WIDE_QUERY } from '../../../hooks/useMediaQuery';
import { archivePlan, deletePlan, neighbourOf, plansTitle, restorePlan } from '../../../utils/plans';
import { today } from '../../../utils/date';
import { TrainingPlan, WorkoutSession } from '../../../types';
import './PlansTab.css';

interface PlansTabProps {
  plans: TrainingPlan[];
  sessions: WorkoutSession[];
  setPlans: (plans: TrainingPlan[]) => void;
  /** Stores plans and reports whether the browser kept them. */
  commitPlans: (plans: TrainingPlan[]) => boolean;
  onStartPlan: (plan: TrainingPlan) => void;
  /** Opens Settings to import a CSV; passed only while the device holds no data. */
  onImport?: () => void;
  /** New plan is open; the shell hides the tab bar meanwhile. */
  creating: boolean;
  onCreatingChange: (creating: boolean) => void;
}

type Overlay = { kind: 'actions' | 'delete'; plan: TrainingPlan } | null;

export function PlansTab({ plans, sessions, setPlans, commitPlans, onStartPlan, onImport, creating, onCreatingChange }: PlansTabProps) {
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [archived, setArchived] = useState<TrainingPlan | null>(null);
  // The plan in the wide detail pane or the phone overview. Not stored; the first plan by default.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Phone only: the selected plan's overview fills the screen instead of the list.
  const [overview, setOverview] = useState(false);
  // The plan just saved, whose overview says so until another plan is shown.
  const [savedId, setSavedId] = useState<string | null>(null);
  const wide = useMediaQuery(WIDE_QUERY);
  const root = useRef<HTMLDivElement>(null);
  // Where focus goes after the next render, when the control that had it is gone.
  const focusNext = useRef<string | null>(null);
  const archivedListId = useId();
  const detailId = useId();
  const todayStr = today();

  // Runs after a sheet has closed and the page is no longer inert.
  useEffect(() => {
    if (!focusNext.current) return;
    root.current?.querySelector<HTMLElement>(focusNext.current)?.focus();
    focusNext.current = null;
  });

  const activePlans = plans.filter((p) => !p.isArchived);
  const archivedPlans = plans.filter((p) => p.isArchived);
  const selected = activePlans.find((p) => p.id === selectedId) ?? activePlans[0];

  // A refused write keeps the form open with what was entered; a kept one shows the plan's overview.
  const savePlan = (p: TrainingPlan) => {
    if (!commitPlans([...plans, p])) return false;
    onCreatingChange(false);
    setSelectedId(p.id);
    setSavedId(p.id);
    setOverview(!wide);
    focusNext.current = '.planDetail__name';
    // The form was likely scrolled down to Save; the confirmation sits at the top.
    if (!wide) window.scrollTo({ top: 0 });
    return true;
  };

  // The form is gone after this render, so focus lands on the Plans heading.
  const closeForm = () => {
    onCreatingChange(false);
    focusNext.current = '.plansTabTitle';
  };

  const select = (plan: TrainingPlan) => {
    setSelectedId(plan.id);
    if (plan.id !== savedId) setSavedId(null);
  };

  const openOverview = (plan: TrainingPlan) => {
    select(plan);
    setOverview(true);
    focusNext.current = '.planDetail__name';
    window.scrollTo({ top: 0 });
  };

  const closeOverview = (plan: TrainingPlan) => {
    setOverview(false);
    setSavedId(null);
    focusNext.current = `[data-plan-open="${CSS.escape(plan.id)}"]`;
  };

  const archive = (plan: TrainingPlan) => {
    setOverview(false);
    setSavedId(null);
    if (plan.id === selected?.id) setSelectedId(neighbourOf(activePlans, plan.id)?.id ?? null);
    setPlans(archivePlan(plans, plan.id, todayStr));
    setOverlay(null);
    setArchived(plan);
    focusNext.current = '.plansTabTitle';
  };

  const restore = (plan: TrainingPlan) => {
    setOverview(false);
    setPlans(restorePlan(plans, plan.id));
    setSelectedId(plan.id);
    setArchived((a) => (a?.id === plan.id ? null : a));
    focusNext.current = `[data-plan-actions="${CSS.escape(plan.id)}"]`;
  };

  const remove = (plan: TrainingPlan) => {
    setPlans(deletePlan(plans, plan.id));
    setOverlay(null);
    setArchived((a) => (a?.id === plan.id ? null : a));
    focusNext.current = archivedPlans.length > 1 ? '.archivedToggle' : '.plansTabTitle';
  };

  // The ⋯ that opened the sheet is gone if the layout switched meanwhile, so aim at the plan's ⋯ in either.
  const closeActions = (plan: TrainingPlan) => {
    setOverlay(null);
    focusNext.current = `[data-plan-actions="${CSS.escape(plan.id)}"]`;
  };

  const showEmpty = activePlans.length === 0;

  // New plan replaces the whole screen, "Plans" heading included.
  if (creating) return <CreatePlanForm onSave={savePlan} onCancel={closeForm} />;

  // Empty: the block's kicker names the tab, so the title stays for screen readers only.
  const header = showEmpty ? (
    <h1 className="plansTabTitle visuallyHidden" tabIndex={-1}>Plans</h1>
  ) : (
    <header className="plansTabHeader">
      <h1 className="plansTabTitle" tabIndex={-1}>{plansTitle(activePlans.length)}</h1>
      <PillButton variant="white" onClick={() => onCreatingChange(true)}>+ Create New</PillButton>
    </header>
  );

  const archivedSection = archivedPlans.length > 0 && (
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
  );

  const overlays = (
    <>
      {overlay?.kind === 'actions' && (
        <PlanActionsSheet plan={overlay.plan} sessions={sessions} today={todayStr} onArchive={archive}
          onClose={() => closeActions(overlay.plan)} />
      )}
      {overlay?.kind === 'delete' && (
        <DeletePlanSheet plan={overlay.plan} onDelete={remove} onClose={() => setOverlay(null)} />
      )}

      {archived && (
        <Toast key={archived.id} message={`${archived.name} archived`} actionLabel="Undo" onAction={() => restore(archived)}
          onDismiss={() => setArchived(null)} />
      )}
    </>
  );

  // Wide: the plans on the left, the chosen one in full on the right. One root in
  // both layouts, so an open sheet or toast survives crossing the breakpoint.
  const panes = wide && selected;
  const phoneOverview = !wide && overview && selected;

  return (
    <div className={`plansTab${archived ? ' plansTab--toast' : ''}${panes ? ' plansTab--wide' : ''}`} ref={root}>
      {phoneOverview ? (
        <PlanDetail id={detailId} plan={selected} sessions={sessions} today={todayStr} saved={selected.id === savedId}
          onBack={() => closeOverview(selected)} onStart={onStartPlan}
          onMore={(plan) => setOverlay({ kind: 'actions', plan })} />
      ) : panes ? (
        <>
          <div className="plansPane">
            {header}
            <ul className="plansTabList" role="list">
              {activePlans.map((p) => (
                <PlanSelectRow key={p.id} plan={p} selected={p.id === selected.id} controls={detailId}
                  onSelect={select} />
              ))}
            </ul>
            {archivedSection}
          </div>
          <PlanDetail id={detailId} plan={selected} sessions={sessions} today={todayStr} saved={selected.id === savedId}
            onStart={onStartPlan} onMore={(plan) => setOverlay({ kind: 'actions', plan })} />
        </>
      ) : (
        <>
          {header}

          {showEmpty ? (
            <EmptyState
              kicker="Plans"
              title="No plans yet"
              text="A plan is the list of exercises you repeat. Make one, then start it from here or from Log."
              action="+ Create New"
              onAction={() => onCreatingChange(true)}
              onImport={onImport}
            />
          ) : (
            <ul className="plansTabList" role="list">
              {activePlans.map((p) => (
                <PlanCard key={p.id} plan={p} onOpen={openOverview} onStart={onStartPlan}
                  onMore={(plan) => setOverlay({ kind: 'actions', plan })} />
              ))}
            </ul>
          )}

          {archivedSection}
        </>
      )}

      {overlays}
    </div>
  );
}

export default PlansTab;
