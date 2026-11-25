import { StepperBlock } from "../../shared";
import { SetDraft } from "../../../utils/setModel";
import { decimal, whole } from "../../../utils/typedNumber";
import "./SetSteppers.css";
import { useUnitPrefs } from "../../../utils/unitPrefs";
import { weightLabel, weightStep } from "../../../utils/units";

interface SetSteppersProps {
  draft: SetDraft;
  onChange: (draft: SetDraft) => void;
  trackWeight: boolean;
  outlined?: boolean;
}

export function SetSteppers({ draft, onChange, trackWeight, outlined }: SetSteppersProps) {
  const { weight } = useUnitPrefs();
  return (
    <div className={`setSteppers${trackWeight ? "" : " setSteppers--single"}`}>
      {trackWeight && (
        <StepperBlock
          label="Weight"
          unit={weightLabel(weight)}
          step={weightStep(weight)}
          value={parseFloat(draft.weight) || 0}
          onChange={(v) => onChange({ ...draft, weight: String(v) })}
          text={draft.weight}
          onType={(t) => onChange({ ...draft, weight: decimal(t) })}
          outlined={outlined}
        />
      )}
      <StepperBlock
        label="Reps"
        unit="reps"
        value={parseInt(draft.reps) || 0}
        onChange={(v) => onChange({ ...draft, reps: String(v) })}
        text={draft.reps}
        onType={(t) => onChange({ ...draft, reps: whole(t) })}
        outlined={outlined}
      />
    </div>
  );
}

export default SetSteppers;
