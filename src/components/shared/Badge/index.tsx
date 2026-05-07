import { CSSProperties, JSX } from "react";
import "./Badge.css";

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
}

export function Badge({ children, color }: BadgeProps): JSX.Element {
  const col = color || "var(--color-text-muted)";
  return (
    <span
      className="badge"
      style={
        {
          border: "1px solid var(--color-line-strong)",
          color: col,
        } as CSSProperties
      }
    >
      {children}
    </span>
  );
}

export default Badge;
