import { CSSProperties } from "react";
import Colors from "../../../constants/colors";
import "./NumericInput.css";

interface NumericInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  step?: number;
  min?: number;
  style?: CSSProperties;
}

export function NumericInput({
  value,
  onChange,
  placeholder,
  step = 1,
  min = 0,
  style: x,
}: NumericInputProps) {
  const current = parseFloat(value) || 0;

  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault();
    onChange(String(+Math.max(current - step, min).toFixed(4)));
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault();
    onChange(String(+(current + step).toFixed(4)));
  };

  return (
    <div className="numeric-input" style={{ ...x }}>
      <button
        onMouseDown={handleDecrement}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = Colors.accentBg;
          e.currentTarget.style.color = Colors.accent;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "none";
          e.currentTarget.style.color = Colors.muted;
        }}
        className="numeric-btn decrement-btn"
      >
        −
      </button>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="numeric-input-field"
      />
      <button
        onMouseDown={handleIncrement}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = Colors.accentBg;
          e.currentTarget.style.color = Colors.accent;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "none";
          e.currentTarget.style.color = Colors.muted;
        }}
        className="numeric-btn increment-btn"
      >
        +
      </button>
    </div>
  );
}

export default NumericInput;
