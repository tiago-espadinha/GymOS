import { StepperBlock } from "../../shared";
import { SetDraft } from "../../../utils/setModel";
import "./SetSteppers.css";

interface SetSteppersProps {
  draft: SetDraft;
  onChange: (draft: SetDraft) => void;
  trackWeight: boolean;
  outlined?: boolean;
}

// Typed text keeps its first decimal point; a comma counts as one (European keyboards).
const decimal = (text: string) => {
  const [whole, ...fraction] = text.replace(/,/g, ".").replace(/[^\d.]/g, "").split(".");
  return fraction.length ? `${whole}.${fraction.join("")}` : whole;
};
const whole = (text: string) => text.replace(/\D/g, "");

export function SetSteppers({ draft, onChange, trackWeight, outlined }: SetSteppersProps) {
  return (
    <div className={`setSteppers${trackWeight ? "" : " setSteppers--single"}`}>
      {trackWeight && (
        <StepperBlock
          label="Weight"
          unit="kg"
          step={2.5}
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
