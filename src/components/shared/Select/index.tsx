import { CSSProperties } from "react";
import "./Select.css";
interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  ariaLabel?: string;
  style?: CSSProperties;
}

export function Select({ value, onChange, children, ariaLabel, style: x }: SelectProps) {
  return (
    <select
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
      className="select"
      style={{ ...x }}
    >
      {children}
    </select>
  );
}

export default Select;
