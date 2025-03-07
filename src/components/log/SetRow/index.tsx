import { NumericInput } from "../../shared";
import { Set } from "../../../types";
import "./SetRow.css";

interface SetRowProps {
  set: Set;
  index: number;
  onChange: (set: Set) => void;
  onRemove: () => void;
}

export function SetRow({ set, index, onChange, onRemove }: SetRowProps) {
  return (
    <div className="setRow">
      <span className="setRowIndex">{index + 1}</span>
      <NumericInput
        value={set.weight}
        onChange={(v) => onChange({ ...set, weight: v })}
        placeholder="0"
        step={2.5}
        style={{ width: "116px" }}
      />
      <span className="setRowUnit">kg</span>
      <span className="setRowMultiplier">×</span>
      <NumericInput
        value={set.reps}
        onChange={(v) => onChange({ ...set, reps: v })}
        placeholder="0"
        step={1}
        style={{ width: "96px" }}
      />
      <span className="setRowReps">reps</span>
      <button onClick={onRemove} className="setRowRemove">
        ×
      </button>
    </div>
  );
}

export default SetRow;
