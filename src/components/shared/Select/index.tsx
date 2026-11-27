import { useId, useState } from 'react';
import { ListboxSheet } from '../ListboxSheet';
import { Icon } from '../Icon';
import './Select.css';

interface SelectProps {
  /** Visible label over the field; also titles the sheet. */
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

/** A field-coloured button that opens its options as a full-screen list. */
export function Select({ label, value, options, onChange }: SelectProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const labelId = `${id}-label`;
  const valueId = `${id}-value`;

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
        <ListboxSheet
          title={label}
          options={options.map((option) => ({ key: option, name: option }))}
          selectedKey={value}
          onPick={pick}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

export default Select;
