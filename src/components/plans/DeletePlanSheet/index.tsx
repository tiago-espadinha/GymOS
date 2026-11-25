import { ConfirmSheet } from "../../shared";
import { exerciseCount } from "../../../utils/plans";
import { TrainingPlan } from "../../../types";

interface DeletePlanSheetProps {
  plan: TrainingPlan;
  onDelete: (plan: TrainingPlan) => void;
  onClose: () => void;
}

/** Delete is never undoable, so it always asks first. */
export function DeletePlanSheet({ plan, onDelete, onClose }: DeletePlanSheetProps) {
  return (
    <ConfirmSheet
      kicker="Delete for good"
      title={`Delete ${plan.name}?`}
      text={`The plan and its ${exerciseCount(plan)} are removed and can't be restored. Sessions you logged with it stay in Log and Stats.`}
      confirmLabel="Delete plan"
      onConfirm={() => onDelete(plan)}
      onClose={onClose}
    />
  );
}

export default DeletePlanSheet;
