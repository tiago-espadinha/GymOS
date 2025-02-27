import { CSSProperties } from "react";
import "./Input.css";
interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  style?: CSSProperties;
}

export function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  style: x,
}: InputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="input"
      style={{
        ...x,
      }}
    />
  );
}

export default Input;
