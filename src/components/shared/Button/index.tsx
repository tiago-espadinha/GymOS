import { CSSProperties } from "react";
import "./Button.css";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger" | "success";
  small?: boolean;
  disabled?: boolean;
  style?: CSSProperties;
}

export function Button({
  children,
  onClick,
  variant = "primary",
  small,
  disabled,
  style: x,
}: ButtonProps) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      className={`button ${variant} ${small ? "small" : ""} ${disabled ? "disabled" : ""}`}
      style={{ ...x }}
    >
      {children}
    </button>
  );
}

export default Button;
