import './SegmentedControl.css';

interface SegmentedControlProps<T extends string> {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** white by default; accent marks the unit of measure. */
  tone?: 'white' | 'accent';
}

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  tone = 'white',
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`segmented${tone === 'accent' ? ' segmented--accent' : ''}`}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          className="segmented__segment"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default SegmentedControl;
