import { useId, type ReactNode } from "react";
import { PrimaryButton } from "../PrimaryButton";
import { SecondaryButton } from "../SecondaryButton";
import { Sheet } from "../Sheet";
import { SheetHead } from "../Sheet/frame";

interface ConfirmSheetProps {
  /** The tracked danger label over the title, e.g. "Delete for good". */
  kicker: string;
  title: ReactNode;
  text: ReactNode;
  /** The destructive choice, e.g. "Delete plan". */
  confirmLabel: string;
  onConfirm: () => void;
  /** The safe choice, which only closes the sheet. */
  keepLabel?: string;
  /** The keep button, Escape or a tap outside. */
  onClose: () => void;
}

/**
 * The app's confirm for a choice that can't be undone, in place of a browser
 * dialog. Keep it gets focus, even when the text holds a link; the destructive
 * choice is the danger outline below it.
 */
export function ConfirmSheet({ kicker, title, text, confirmLabel, onConfirm, keepLabel = "Keep it", onClose }: ConfirmSheetProps) {
  const titleId = useId();
  const bodyId = useId();
  return (
    <Sheet role="alertdialog" labelledBy={titleId} describedBy={bodyId} onClose={onClose}>
      <SheetHead titleId={titleId} tone="danger" kicker={kicker} title={title} />
      <p id={bodyId} className="sheet__text">
        {text}
      </p>
      <PrimaryButton tone="light" onClick={onClose} data-autofocus>
        {keepLabel}
      </PrimaryButton>
      <SecondaryButton tone="danger" onClick={onConfirm}>
        {confirmLabel}
      </SecondaryButton>
    </Sheet>
  );
}

export default ConfirmSheet;
