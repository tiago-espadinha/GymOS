import { PrimaryButton, StepperBlock } from "../../shared";
import { Set } from "../../../types";
import { whole } from "../../../utils/typedNumber";
import SetSteppers from "../SetSteppers";
import DistanceField from "../TimedSetBlock/DistanceField";

interface EditSetPanelProps {
  /** The set as edited so far. */
  set: Set;
  index: number;
  timed: boolean;
  trackWeight: boolean;
  /** Set when a timed exercise tracks distance. */
  distanceUnit?: "km" | "mi";
  canSave: boolean;
  onChange: (set: Set) => void;
  onSave: () => void;
  onDelete: () => void;
  onCancel: () => void;
}

// Outlined steppers for a logged set, then Save, with Cancel left and Delete right.
export function EditSetPanel({ set, index, timed, trackWeight, distanceUnit, canSave, onChange, onSave, onDelete, onCancel }: EditSetPanelProps) {
  const n = index + 1;
  return (
    <>
      {timed ? (
        <div className="setSteppers setSteppers--single">
          <StepperBlock
            label="Time"
            unit="sec"
            step={5}
            value={Number(set.duration) || 0}
            onChange={(v) => onChange({ ...set, duration: String(v) })}
            text={set.duration ?? ""}
            onType={(t) => onChange({ ...set, duration: whole(t) })}
            outlined
          />
          {distanceUnit && (
            <DistanceField setNumber={n} unit={distanceUnit} value={set.distance ?? ""} onChange={(d) => onChange({ ...set, distance: d })} outlined />
          )}
        </div>
      ) : (
        <SetSteppers draft={set} onChange={(d) => onChange({ ...set, ...d })} trackWeight={trackWeight} outlined />
      )}
      <PrimaryButton onClick={onSave} disabled={!canSave}>
        Save set {n}
      </PrimaryButton>
      <div className="exerciseLoggerEditActions">
        <button type="button" className="exerciseLoggerCancel" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="exerciseLoggerDelete" onClick={onDelete}>
          Delete set {n}
        </button>
      </div>
    </>
  );
}

export default EditSetPanel;
