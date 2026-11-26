import type { ReactNode } from "react";
import { Icon } from "../Icon";
import "./SaveFailedAlert.css";

interface SaveFailedAlertProps {
  /** What was not stored and what the user can do about it. */
  children: ReactNode;
}

/** The danger alert shown when the browser refuses to store a save. */
export function SaveFailedAlert({ children }: SaveFailedAlertProps) {
  return (
    <div role="alert" className="save-failed">
      <p className="save-failed__title">
        <Icon name="warning" />
        Not saved
      </p>
      <p className="save-failed__text">{children}</p>
    </div>
  );
}

export default SaveFailedAlert;
