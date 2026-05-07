import { stepValue } from './stepValue';
import './StepperBlock.css';

interface StepperBlockProps {
  label: string;
  value: number;
  unit: string;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
}

export function StepperBlock({
  label,
  value,
  unit,
  onChange,
  step = 1,
  min = 0,
}: StepperBlockProps) {
  return (
    <div role="group" aria-label={label} className="stepper-block">
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        disabled={value <= min}
        className="stepper-block__button"
        onClick={() => onChange(stepValue(value, -step, min))}
      >
        −
      </button>
      <div className="stepper-block__reading">
        <span className="stepper-block__value">{value}</span>
        <span className="stepper-block__unit">{unit}</span>
      </div>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        className="stepper-block__button"
        onClick={() => onChange(stepValue(value, step, min))}
      >
        +
      </button>
    </div>
  );
}

export default StepperBlock;
