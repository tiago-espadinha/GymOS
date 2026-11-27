import { PrimaryButton } from "../../shared";
import { Set } from "../../../types";
import SetField from "../SetField";
import { timeFormat } from "../SetField/timeFormat";
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

// Outlined fields for a logged set (a time is typed, the rest step), then Save, with Cancel left and Delete right.
export function EditSetPanel({ set, index, timed, trackWeight, distanceUnit, canSave, onChange, onSave, onDelete, onCancel }: EditSetPanelProps) {
  const n = index + 1;
  return (
    <>
      {timed ? (
        <div className="setSteppers setSteppers--single">
          {/* A label, so a tap anywhere on the block reaches the field. */}
          <label className="exerciseLoggerTime">
            <SetField
              // The panel stays up when another row's Edit is pressed; the field holds its own text.
              key={set.id}
              className="exerciseLoggerTimeField"
              label="Time"
              value={set.duration}
              format={timeFormat}
              onChange={(duration) => onChange({ ...set, duration })}
            />
            <span className="exerciseLoggerTimeUnit" aria-hidden="true">
              Time
            </span>
          </label>
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
