import { PrimaryButton } from "../../shared";
import { describeExercise } from "../CreatePlanForm/describeExercise";
import { planDetailKicker, planSummary } from "../../../utils/plans";
import { TrainingPlan, WorkoutSession } from "../../../types";
import "./PlanDetail.css";

interface PlanDetailProps {
  id: string;
  plan: TrainingPlan;
  sessions: WorkoutSession[];
  today: string;
  onStart: (plan: TrainingPlan) => void;
  onMore: (plan: TrainingPlan) => void;
}

/** Wide Plans' right pane: the selected plan, Start, ⋯ and every exercise in order. */
export function PlanDetail({ id, plan, sessions, today, onStart, onMore }: PlanDetailProps) {
  const titleId = `${id}-title`;
  return (
    <section id={id} className="planDetail" aria-labelledby={titleId}>
      <p className="planDetail__kicker">{planDetailKicker(plan, sessions, today)}</p>
      <h2 id={titleId} className="planDetail__name">{plan.name}</h2>
      <p className="planDetail__meta">{planSummary(plan)}</p>
      <div className="planDetail__actions">
        <PrimaryButton tone="lime" onClick={() => onStart(plan)} aria-label={`Start ${plan.name}`}>
          Start
        </PrimaryButton>
        <button
          type="button"
          className="planDetail__more"
          data-plan-actions={plan.id}
          aria-label={`More actions for ${plan.name}`}
          aria-haspopup="dialog"
          onClick={() => onMore(plan)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
          </svg>
        </button>
      </div>
      <h3 className="planDetail__label">Exercises</h3>
      <ol className="planDetail__exercises">
        {plan.exercises.map((ex, i) => (
          <li key={ex.id} className="planDetail__exercise">
            <span className="planDetail__number" aria-hidden="true">{i + 1}</span>
            <span className="planDetail__exerciseName">{ex.name}</span>
            <span className="planDetail__exerciseMeta">{describeExercise(ex)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default PlanDetail;
