import './Switch.css';

interface SwitchProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** A full-width row with a pill switch on the right; lime when on. */
export function Switch({ label, description, checked, onChange }: SwitchProps) {
  return (
    <button type="button" role="switch" aria-checked={checked} className="switch" onClick={() => onChange(!checked)}>
      <span className="switch__text">
        <span className="switch__label">{label}</span>
        {description && <span className="switch__description">{description}</span>}
      </span>
      <span className="switch__track" aria-hidden="true">
        <span className="switch__thumb" />
      </span>
    </button>
  );
}

export default Switch;
