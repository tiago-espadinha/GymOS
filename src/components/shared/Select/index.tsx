import { useId, useState } from 'react';
import { Sheet } from '../Sheet';
import { Icon } from '../Icon';
import { moveListboxFocus } from './listbox';
import './Select.css';

interface SelectProps {
  /** Visible label over the field; also titles the sheet. */
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
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
        <Icon name="chevron-down" className="select__chevron" />
      </button>

      {open && (
        <Sheet labelledBy={titleId} onClose={() => setOpen(false)}>
          <h2 id={titleId} className="sheet__title">{label}</h2>
          <div role="listbox" aria-labelledby={titleId} className="select__list" onKeyDown={moveListboxFocus}>
            {options.map((option) => (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={option === value}
                tabIndex={option === value ? 0 : -1}
                data-autofocus={option === value || undefined}
                className="select__option"
                onClick={() => pick(option)}
              >
                {option}
                {option === value && <Icon name="check" />}
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
