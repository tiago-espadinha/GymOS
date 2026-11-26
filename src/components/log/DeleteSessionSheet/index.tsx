import { ConfirmSheet } from "../../shared";
import { formatDateMeta } from "../../../utils/date";

interface DeleteSessionSheetProps {
  planName: string;
  /** The session's date, shown as the session screens show it. */
  date: string;
  onDelete: () => void;
  onClose: () => void;
}

/** Delete is never undoable, so it always asks first. */
export function DeleteSessionSheet({ planName, date, onDelete, onClose }: DeleteSessionSheetProps) {
  return (
    <ConfirmSheet
      kicker="Delete for good"
      title={`Delete ${planName}, ${formatDateMeta(date)}?`}
      text="The session and its sets are removed from Log and Stats and can't be restored."
      confirmLabel="Delete session"
      onConfirm={onDelete}
      onClose={onClose}
    />
  );
}

export default DeleteSessionSheet;
