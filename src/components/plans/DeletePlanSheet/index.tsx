import { useId } from "react";
import { PrimaryButton, Sheet } from "../../shared";
import { exerciseCount } from "../../../utils/plans";
import { TrainingPlan } from "../../../types";
import "./DeletePlanSheet.css";

interface DeletePlanSheetProps {
  plan: TrainingPlan;
  onDelete: (plan: TrainingPlan) => void;
  onClose: () => void;
}

/** Delete is never undoable, so it always asks first. Keep it comes first, so it gets focus. */
export function DeletePlanSheet({ plan, onDelete, onClose }: DeletePlanSheetProps) {
  const titleId = useId();
  const bodyId = useId();
  return (
    <Sheet role="alertdialog" labelledBy={titleId} describedBy={bodyId} onClose={onClose}>
      <span className="sheet__kicker sheet__kicker--danger">Delete for good</span>
      <h2 id={titleId} className="sheet__title sheet__title--lg">Delete {plan.name}?</h2>
      <p id={bodyId} className="sheet__text">
        The plan and its {exerciseCount(plan)} are removed and can't be restored. Sessions you logged with it stay
        in Log and Progress.
      </p>
      <PrimaryButton tone="light" onClick={onClose}>
        Keep it
      </PrimaryButton>
      <button type="button" className="deletePlan__confirm" onClick={() => onDelete(plan)}>
        Delete plan
      </button>
    </Sheet>
  );
}

export default DeletePlanSheet;
