import { useRef, useState } from "react";
import { EmptyState, Icon, PrimaryButton } from "../../shared";
import { formatDateMeta, today } from "../../../utils/date";
import { defaultPlan, planPreview, planTrainedSummary } from "../../../utils/plans";
import { TrainingPlan, WorkoutSession } from "../../../types";
import { useFitLines } from "../../../hooks/useFitLines";
import DateSheet from "../DateSheet";
import PlanPicker from "../PlanPicker";
import RecentSessions from "./RecentSessions";
import "./LogHome.css";

interface LogHomeProps {
  plans: TrainingPlan[];
  sessions: WorkoutSession[];
  date: string;
  onDateChange: (date: string) => void;
  onStart: (plan: TrainingPlan) => void;
  onEdit: (session: WorkoutSession) => void;
  /** The session just saved or updated, marked in Recent. */
  justSaved: { id: string; label: string } | null;
  onNewPlan: () => void;
  /** Opens Settings to import a CSV; passed only while the device holds no data. */
  onImport?: () => void;
}

// Two lines at hero size, else three lines of a size that takes the same height (LogHome.css).
function PlanName({ name }: { name: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useFitLines(ref, name, 2, 3);
  return (
    <span ref={ref} className="logHomeHeadline">
      {name}
    </span>
  );
}

// Wide only: the plan's first exercises and how many more follow.
function PlanPreview({ plan }: { plan: TrainingPlan }) {
  const { names, more } = planPreview(plan);
  if (names.length === 0) return null;
  return (
    <>
      <ol className="logHomeExercises" role="list" aria-label={`${plan.name} exercises`}>
        {names.map((name, i) => (
          <li key={i}>{name}</li>
        ))}
      </ol>
      <p className="logHomeMore">{more > 0 && `+ ${more} more`}</p>
    </>
  );
}

export function LogHome({ plans, sessions, date, onDateChange, onStart, onEdit, justSaved, onNewPlan, onImport }: LogHomeProps) {
  const [planId, setPlanId] = useState("");
  const [open, setOpen] = useState<"plan" | "date" | null>(null);
  const activePlans = plans.filter((p) => !p.isArchived);
  // A chosen plan that was archived or deleted meanwhile falls back to the default.
  const plan = activePlans.find((p) => p.id === planId) ?? defaultPlan(activePlans, sessions);

  const emptyRecent = (
    <p className="logHomeEmptyText">No sessions yet. Your first one lands here after you press Start and save it.</p>
  );
  const hasContent = Boolean(plan) || sessions.length > 0;

  return (
    <div className={hasContent ? "logHome" : "logHome logHome--empty"}>
      {plan ? (
        <section className="logHomeBlock" aria-label="New session">
          <div className="logHomeBlockTop">
            <span className="logHomeKicker" aria-hidden="true">
              New session
            </span>
            <button type="button" className="logHomeChoice" aria-haspopup="dialog" onClick={() => setOpen("date")}>
              <span className="visuallyHidden">Session date: </span>
              {formatDateMeta(date)}
              <Icon name="chevron-down" />
            </button>
          </div>
          <button type="button" className="logHomePlan" aria-haspopup="dialog" onClick={() => setOpen("plan")}>
            <span className="visuallyHidden">Training plan: </span>
            <PlanName name={plan.name} />
            <Icon name="chevron-down" size="xl" className="logHomePlanChevron" />
          </button>
          <span className="logHomeLead">{planTrainedSummary(plan, sessions, today())}</span>
          {/* Wide only: Change plan beside Start. */}
          <PlanPreview plan={plan} />
          <div className="logHomeActions">
            <PrimaryButton tone="dark" onClick={() => onStart(plan)}>
              Start
            </PrimaryButton>
            <button type="button" className="logHomeChangePlan" aria-haspopup="dialog" onClick={() => setOpen("plan")}>
              Change plan
            </button>
          </div>
        </section>
      ) : (
        <EmptyState
          kicker="New session"
          title={sessions.length ? "No plans yet" : "No sessions yet"}
          text={
            sessions.length
              ? "Sessions start from a plan. Make one with the exercises you repeat."
              : "Sessions start from a plan. Make one, press Start, and every session you save lands here."
          }
          action="+ New plan"
          onAction={onNewPlan}
          onImport={onImport}
        />
      )}

      {hasContent && (
        <RecentSessions sessions={sessions} onEdit={onEdit} justSaved={justSaved} empty={emptyRecent} />
      )}

      {open === "plan" && plan && (
        <PlanPicker
          plans={activePlans}
          sessions={sessions}
          selectedId={plan.id}
          hasArchived={activePlans.length < plans.length}
          onPick={(p) => {
            setPlanId(p.id);
            setOpen(null);
          }}
          onClose={() => setOpen(null)}
        />
      )}
      {open === "date" && <DateSheet value={date} onChange={onDateChange} onClose={() => setOpen(null)} />}
    </div>
  );
}

export default LogHome;
