import { CSSProperties } from "react";
import "./Select.css";
interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  style?: CSSProperties;
}

export function Select({ value, onChange, children, style: x }: SelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="select"
      style={{ ...x }}
    >
      {children}
    </select>
  );
}

export default Select;
