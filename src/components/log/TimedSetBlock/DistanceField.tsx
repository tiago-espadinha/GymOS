import { StepperBlock } from "../../shared";
import { decimal } from "../../../utils/typedNumber";

interface DistanceFieldProps {
  setNumber: number;
  unit: "km" | "mi";
  value: string;
  onChange: (value: string) => void;
  outlined?: boolean;
}

// The distance of a timed set, labelled with the set it belongs to.
export default function DistanceField({ setNumber, unit, value, onChange, outlined }: DistanceFieldProps) {
  const label = `Distance · set ${setNumber}`;
  return (
    <div className="timedSetTarget">
      {/* The stepper carries the same text as its accessible name. */}
      <span className="timedSetLabel" aria-hidden="true">{label}</span>
      <StepperBlock
        label={label}
        unit={unit}
        step={0.1}
        value={parseFloat(value) || 0}
        onChange={(v) => onChange(String(v))}
        text={value}
        onType={(t) => onChange(decimal(t))}
        outlined={outlined}
      />
    </div>
  );
}
