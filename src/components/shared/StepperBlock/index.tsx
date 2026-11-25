import { stepValue } from './stepValue';
import './StepperBlock.css';

// Longer typed values step down in size so they stay inside a half-width block.
const inputSize = (length: number) =>
  length > 4 ? " stepper-block__input--long stepper-block__input--xlong" : length > 3 ? " stepper-block__input--long" : "";

interface StepperBlockProps {
  label: string;
  value: number;
  unit: string;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  /** Makes the value a typeable field holding this text; onType receives what is typed. */
  text?: string;
  onType?: (text: string) => void;
  /** Outlined in white, e.g. while editing a logged set. */
  outlined?: boolean;
}

export function StepperBlock({
  label,
  value,
  unit,
  onChange,
  step = 1,
  min = 0,
  text,
  onType,
  outlined = false,
}: StepperBlockProps) {
  return (
    <div role="group" aria-label={label} className={`stepper-block${outlined ? ' stepper-block--outlined' : ''}`}>
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        disabled={value <= min}
        className="stepper-block__button"
        onClick={() => onChange(stepValue(value, -step, min))}
      >
        −
      </button>
      {/* A typed field announces itself; only a read-only reading needs the live region. */}
      <div className="stepper-block__reading" aria-live={onType ? undefined : 'polite'}>
        {onType ? (
          <input
            className={`stepper-block__value stepper-block__input${inputSize((text ?? "").length)}`}
            aria-label={label}
            inputMode="decimal"
            placeholder="0"
            value={text ?? ''}
            onChange={(e) => onType(e.target.value)}
          />
        ) : (
          <span className="stepper-block__value">{value}</span>
        )}
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
