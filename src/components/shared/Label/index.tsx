import { JSX } from "react";
import "./Label.css";
interface LabelProps {
  children: React.ReactNode;
}

export function Label({ children }: LabelProps): JSX.Element {
  return <div className="label">{children}</div>;
}

export default Label;
