import { useEffect, useId, useRef, useState } from 'react';
import { EmptyState, Icon, PillButton, Toast } from '../../shared';
import CreatePlanForm from '../CreatePlanForm';
import PlanCard from '../PlanCard';
import ArchivedPlanRow from '../ArchivedPlanRow';
import PlanActionsSheet from '../PlanActionsSheet';
import DeletePlanSheet from '../DeletePlanSheet';
import PlanDetail from '../PlanDetail';
import PlanSelectRow from '../PlanSelectRow';
import { useMediaQuery, WIDE_QUERY } from '../../../hooks/useMediaQuery';
import { archivePlan, carryRenames, deletePlan, neighbourOf, plansTitle, renameNote, restorePlan } from '../../../utils/plans';
import { today } from '../../../utils/date';
import { TrainingPlan, WorkoutSession } from '../../../types';
import './PlansTab.css';

interface PlansTabProps {
  plans: TrainingPlan[];
  sessions: WorkoutSession[];
  setPlans: (plans: TrainingPlan[]) => void;
  /** Stores plans and reports whether the browser kept them. */
  commitPlans: (plans: TrainingPlan[]) => boolean;
  /** Stores an edited plan, renaming it in its past sessions; false when the browser refused. */
  commitPlanEdit: (plan: TrainingPlan) => boolean;
  onStartPlan: (plan: TrainingPlan) => void;
  /** Opens Settings to import a CSV; passed only while the device holds no data. */
  onImport?: () => void;
  /** New plan or Edit plan is open; the shell hides the tab bar meanwhile. */
  formOpen: boolean;
  onFormOpenChange: (open: boolean) => void;
}

type Overlay = { kind: 'actions' | 'delete'; plan: TrainingPlan } | null;

export function PlansTab({ plans, sessions, setPlans, commitPlans, commitPlanEdit, onStartPlan, onImport, formOpen, onFormOpenChange }: PlansTabProps) {
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [archived, setArchived] = useState<TrainingPlan | null>(null);
  // The plan in the wide detail pane or the phone overview. Not stored; the first plan by default.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Phone only: the selected plan's overview fills the screen instead of the list.
  const [overview, setOverview] = useState(false);
  // The plan just saved, whose overview says so until another plan is shown.
  const [saved, setSaved] = useState<{ id: string; kind: 'new' | 'edited' } | null>(null);
  // The plan open in the form; null while the form makes a new one.
  const [editing, setEditing] = useState<TrainingPlan | null>(null);
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
    if (!(editing ? commitPlanEdit(p) : commitPlans([...plans, p]))) return false;
    onFormOpenChange(false);
    setEditing(null);
    setSelectedId(p.id);
    setSaved({ id: p.id, kind: editing ? 'edited' : 'new' });
    setOverview(!wide);
    focusNext.current = '.planDetail__name';
    // The form was likely scrolled down to Save; the confirmation sits at the top.
    if (!wide) window.scrollTo({ top: 0 });
    return true;
  };

  // The form is gone after this render: focus lands on the edited plan's ⋯, or the Plans heading.
  const closeForm = () => {
    onFormOpenChange(false);
    setEditing(null);
    focusNext.current = editing ? `[data-plan-actions="${CSS.escape(editing.id)}"]` : '.plansTabTitle';
  };

  const edit = (plan: TrainingPlan) => {
    setOverlay(null);
    setEditing(plan);
    onFormOpenChange(true);
    window.scrollTo({ top: 0 });
  };

  const historyNote = (draft: TrainingPlan) =>
    editing && renameNote(editing, draft, carryRenames(sessions, editing, draft).changed);

  const select = (plan: TrainingPlan) => {
    setSelectedId(plan.id);
    if (plan.id !== saved?.id) setSaved(null);
  };

  const openOverview = (plan: TrainingPlan) => {
    select(plan);
    setOverview(true);
    focusNext.current = '.planDetail__name';
    window.scrollTo({ top: 0 });
  };

  const closeOverview = (plan: TrainingPlan) => {
    setOverview(false);
    setSaved(null);
    focusNext.current = `[data-plan-open="${CSS.escape(plan.id)}"]`;
  };

  const archive = (plan: TrainingPlan) => {
    setOverview(false);
    setSaved(null);
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

  // The plan form replaces the whole screen, "Plans" heading included.
  if (formOpen) {
    return <CreatePlanForm key={editing?.id ?? 'new'} plan={editing ?? undefined} historyNote={historyNote}
      onSave={savePlan} onCancel={closeForm} />;
  }

  // Empty: the block's kicker names the tab, so the title stays for screen readers only.
  const header = showEmpty ? (
    <h1 className="plansTabTitle visuallyHidden" tabIndex={-1}>Plans</h1>
  ) : (
    <header className="plansTabHeader">
      <h1 className="plansTabTitle" tabIndex={-1}>{plansTitle(activePlans.length)}</h1>
      <PillButton variant="white" onClick={() => onFormOpenChange(true)}>
        <Icon name="plus" />
        Create New
      </PillButton>
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
        <Icon name="chevron-down" className="archivedChevron" />
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
        <PlanActionsSheet plan={overlay.plan} sessions={sessions} today={todayStr} onEdit={edit} onArchive={archive}
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
        <PlanDetail id={detailId} plan={selected} sessions={sessions} today={todayStr} saved={saved?.id === selected.id ? saved.kind : null}
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
          <PlanDetail id={detailId} plan={selected} sessions={sessions} today={todayStr} saved={saved?.id === selected.id ? saved.kind : null}
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
              action={<><Icon name="plus" />Create New</>}
              onAction={() => onFormOpenChange(true)}
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
