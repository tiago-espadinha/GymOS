import { useState } from "react";
import { ChipGroup, TimeField } from "../../shared";
import { WORK_PRESETS, formatPresetLabel } from "../../../constants/timerPresets";
import { ExerciseCategory } from "../../../types";

interface TargetChoiceProps {
  category: ExerciseCategory;
  targetSec: number;
  onChange: (seconds: number) => void;
}

// The category's presets, then "Other" with a typed time for anything else.
export function TargetChoice({ category, targetSec, onChange }: TargetChoiceProps) {
  const presets = WORK_PRESETS[category];
  const isPreset = presets.includes(targetSec);
  // The field stays up until a preset chip is tapped: closing it as it is left
  // would move the Start button out from under that same tap.
  const [open, setOpen] = useState(false);
  // "Other" was tapped and nothing is typed yet.
  const [picking, setPicking] = useState(false);

  return (
    <div className="timedSetTarget">
      <span className="timedSetLabel" aria-hidden="true">Target</span>
      <ChipGroup
        label="Target time"
        options={[
          ...presets.map((s) => ({ value: String(s), label: formatPresetLabel(s) })),
          { value: "other", label: "Other" },
        ]}
        value={picking || !isPreset ? "other" : String(targetSec)}
        onChange={(v) => {
          setOpen(v === "other");
          setPicking(v === "other");
          if (v !== "other") onChange(Number(v));
        }}
      />
      {(open || !isPreset) && (
        // Left without typing, the chip selection goes back to the target.
        <label className="timedSetOther" onBlur={() => setPicking(false)}>
          <TimeField
            label="Other target"
            seconds={targetSec}
            // Only when asked for: a target that merely is off the chips must not raise the keyboard.
            autoFocus={picking}
            onCommit={(seconds) => {
              setOpen(true);
              setPicking(false);
              onChange(seconds);
            }}
          />
          <span className="timedSetOtherCaption" aria-hidden="true">Target</span>
        </label>
      )}
    </div>
  );
}

export default TargetChoice;
