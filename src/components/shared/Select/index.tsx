import { useId, useState, type KeyboardEvent } from 'react';
import { Sheet } from '../Sheet';
import './Select.css';

interface SelectProps {
  /** Visible label over the field; also titles the sheet. */
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

/** Up/Down/Home/End move between the options; Enter or Space picks one (they are buttons). */
function moveFocus(e: KeyboardEvent<HTMLDivElement>) {
  const options = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="option"]'));
  const at = options.indexOf(document.activeElement as HTMLElement);
  const next = { ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: options.length - 1 }[e.key];
  if (next === undefined) return;
  e.preventDefault();
  options[Math.max(0, Math.min(options.length - 1, next))]?.focus();
}

/** A field-coloured button that opens its options in a bottom sheet listbox. */
export function Select({ label, value, options, onChange }: SelectProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const labelId = `${id}-label`;
  const valueId = `${id}-value`;
  const titleId = `${id}-title`;

  const pick = (option: string) => {
    onChange(option);
    setOpen(false);
  };

  return (
    <div className="select">
      <span id={labelId} className="select__label">{label}</span>
      <button
        type="button"
        className="select__button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${labelId} ${valueId}`}
        onClick={() => setOpen(true)}
      >
        <span id={valueId} className="select__value">{value}</span>
        <svg className="select__chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <Sheet labelledBy={titleId} onClose={() => setOpen(false)}>
          <h2 id={titleId} className="sheet__title">{label}</h2>
          <div role="listbox" aria-labelledby={titleId} className="select__list" onKeyDown={moveFocus}>
            {options.map((option) => (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={option === value}
                data-autofocus={option === value || undefined}
                className="select__option"
                onClick={() => pick(option)}
              >
                {option}
              </button>
            ))}
          </div>
          <button type="button" className="sheet__cancel" onClick={() => setOpen(false)}>Cancel</button>
        </Sheet>
      )}
    </div>
  );
}

export default Select;
