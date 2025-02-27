import { CSSProperties, JSX } from "react";
import Colors from "../../../constants/colors";
import "./Badge.css";

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
}

export function Badge({ children, color }: BadgeProps): JSX.Element {
  const col = color || Colors.muted;
  return (
    <span
      className="badge"
      style={
        {
          border: `1px solid ${col}40`,
          background: col + "18",
          color: col,
        } as CSSProperties
      }
    >
      {children}
    </span>
  );
}

export default Badge;
