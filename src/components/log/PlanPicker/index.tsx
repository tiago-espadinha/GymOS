import { ListboxSheet } from "../../shared";
import { planTrainedSummary } from "../../../utils/plans";
import { today } from "../../../utils/date";
import { TrainingPlan, WorkoutSession } from "../../../types";

interface PlanPickerProps {
  /** Active plans only. */
  plans: TrainingPlan[];
  sessions: WorkoutSession[];
  selectedId: string;
  /** Archived plans are not offered; a note says where to restore them. */
  hasArchived: boolean;
  onPick: (plan: TrainingPlan) => void;
  onClose: () => void;
}

export function PlanPicker({ plans, sessions, selectedId, hasArchived, onPick, onClose }: PlanPickerProps) {
  const todayStr = today();
  const options = plans.map((plan) => ({
    key: plan.id,
    name: plan.name,
    meta: planTrainedSummary(plan, sessions, todayStr, "last"),
  }));
  return (
    <ListboxSheet
      title="Pick a plan"
      options={options}
      selectedKey={selectedId}
      onPick={(key) => {
        const plan = plans.find((p) => p.id === key);
        if (plan) onPick(plan);
      }}
      onClose={onClose}
    >
      {hasArchived && <p className="planPicker__note">Archived plans aren't listed. Restore one from Plans.</p>}
    </ListboxSheet>
  );
}

export default PlanPicker;
