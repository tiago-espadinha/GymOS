import './SegmentedControl.css';

interface SegmentedControlProps<T extends string> {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** white by default; lime marks the unit of measure. */
  tone?: 'white' | 'lime';
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
      className={`segmented segmented--${tone}`}
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
