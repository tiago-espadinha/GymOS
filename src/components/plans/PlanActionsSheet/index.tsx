import { useId } from "react";
import { SecondaryButton, Sheet, SheetHead, SheetRow, SheetRows } from "../../shared";
import { planActionsSummary } from "../../../utils/plans";
import { TrainingPlan, WorkoutSession } from "../../../types";

interface PlanActionsSheetProps {
  plan: TrainingPlan;
  sessions: WorkoutSession[];
  today: string;
  onEdit: (plan: TrainingPlan) => void;
  onArchive: (plan: TrainingPlan) => void;
  onClose: () => void;
}

/** The ⋯ sheet of an active plan: edit or archive it. Delete lives in Archived. */
export function PlanActionsSheet({ plan, sessions, today, onEdit, onArchive, onClose }: PlanActionsSheetProps) {
  const titleId = useId();
  return (
    <Sheet labelledBy={titleId} onClose={onClose}>
      <SheetHead titleId={titleId} tone="accent" kicker="Plan" title={plan.name}
        meta={planActionsSummary(plan, sessions, today)} />
      <SheetRows>
        <SheetRow title="Edit plan" hint="Name, description and exercises." hintUnder onClick={() => onEdit(plan)} />
        <SheetRow title="Archive plan" hint="Hides it from Plans and Log. Restore it from Archived." hintUnder
          onClick={() => onArchive(plan)} />
      </SheetRows>
      <SecondaryButton onClick={onClose}>Close</SecondaryButton>
    </Sheet>
  );
}

export default PlanActionsSheet;
