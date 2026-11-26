import { Icon, PillButton, PrimaryButton } from "../../shared";
import { describeExercise } from "../CreatePlanForm/describeExercise";
import { planDetailKicker, planSummary } from "../../../utils/plans";
import { TrainingPlan, WorkoutSession } from "../../../types";
import "./PlanDetail.css";
import { useUnitPrefs } from "../../../utils/unitPrefs";

interface PlanDetailProps {
  id: string;
  plan: TrainingPlan;
  sessions: WorkoutSession[];
  today: string;
  /** Just saved: the kicker confirms it, and on its own screen DONE leads back. */
  saved?: boolean;
  /** Given on the phone, where the overview is its own screen under a back link. */
  onBack?: () => void;
  onStart: (plan: TrainingPlan) => void;
  onMore: (plan: TrainingPlan) => void;
}

/** A plan's overview: the wide Plans' right pane, or a screen of its own on the phone. */
export function PlanDetail({ id, plan, sessions, today, saved = false, onBack, onStart, onMore }: PlanDetailProps) {
  const titleId = `${id}-title`;
  const savedId = `${id}-saved`;
  const { distance } = useUnitPrefs();
  const Title = onBack ? "h1" : "h2";
  const Label = onBack ? "h2" : "h3";
  return (
    <section id={id} className={`planDetail${onBack ? " planDetail--screen" : ""}`} aria-labelledby={titleId}>
      {onBack && (
        <div className="planDetail__top">
          <button type="button" className="planDetail__back" aria-label="Back to Plans" onClick={onBack}>
            <Icon name="chevron-left" />
            Plans
          </button>
          {saved && <PillButton variant="white" onClick={onBack}>Done</PillButton>}
        </div>
      )}
      {saved ? (
        <p id={savedId} className="planDetail__kicker planDetail__kicker--saved">Plan saved</p>
      ) : (
        <p className="planDetail__kicker">{planDetailKicker(plan, sessions, today)}</p>
      )}
      <Title id={titleId} className="planDetail__name" tabIndex={-1} aria-describedby={saved ? savedId : undefined}>{plan.name}</Title>
      <p className="planDetail__meta">{planSummary(plan)}</p>
      {plan.desc && <p className="planDetail__desc">{plan.desc}</p>}
      <div className="planDetail__actions">
        <PrimaryButton tone="accent" onClick={() => onStart(plan)} aria-label={`Start ${plan.name}`}>
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
          <Icon name="more" size="md" />
        </button>
      </div>
      <Label className="planDetail__label">Exercises</Label>
      <ol className="planDetail__exercises">
        {plan.exercises.map((ex, i) => (
          <li key={ex.id} className="planDetail__exercise">
            <span className="planDetail__number" aria-hidden="true">{i + 1}</span>
            <span className="planDetail__exerciseName">{ex.name}</span>
            <span className="planDetail__exerciseMeta">{describeExercise(ex, distance)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default PlanDetail;
