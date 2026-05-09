import { useId } from "react";
import { PrimaryButton, Sheet } from "../../shared";
import { formatDateFull } from "../../../utils/date";

interface DeleteSessionSheetProps {
  planName: string;
  /** The session's date as the editing kicker shows it. */
  date: string;
  onDelete: () => void;
  onClose: () => void;
}

/** Delete is never undoable, so it always asks first. Keep it comes first, so it gets focus. */
export function DeleteSessionSheet({ planName, date, onDelete, onClose }: DeleteSessionSheetProps) {
  const titleId = useId();
  const bodyId = useId();
  return (
    <Sheet role="alertdialog" labelledBy={titleId} describedBy={bodyId} onClose={onClose}>
      <span className="sheet__kicker sheet__kicker--danger">Delete for good</span>
      <h2 id={titleId} className="sheet__title sheet__title--lg">
        Delete {planName}, {formatDateFull(date)}?
      </h2>
      <p id={bodyId} className="sheet__text">
        The session and its sets are removed from Log and Progress and can't be restored.
      </p>
      <PrimaryButton tone="light" onClick={onClose}>
        Keep it
      </PrimaryButton>
      <button type="button" className="sheet__danger" onClick={onDelete}>
        Delete session
      </button>
    </Sheet>
  );
}

export default DeleteSessionSheet;
