import { useId } from "react";
import { Icon, PrimaryButton, SecondaryButton, Sheet, SheetHead, SheetRow, SheetRows } from "../../shared";
import { CSVImport } from "../../../utils/csv";
import { foundText } from "./importSummary";
import { ImportStep } from "./readImport";

interface ImportSheetProps {
  step: ImportStep;
  /** What Replace deletes, or null when the device holds nothing. */
  deletes: string | null;
  onAdd: (data: CSVImport) => void;
  onReplace: (data: CSVImport) => void;
  onChooseFile: () => void;
  onSeeStats: () => void;
  /** Cancel import, Close, Done, Escape or a tap outside. Nothing is written. */
  onClose: () => void;
}

/** The heading takes focus on each step, so a stray tap or Enter never lands on a choice. */
export function ImportSheet({ step, deletes, onAdd, onReplace, onChooseFile, onSeeStats, onClose }: ImportSheetProps) {
  const titleId = useId();
  return (
    <Sheet labelledBy={titleId} onClose={onClose}>
      {step.kind === "ready" && (
        <>
          <SheetHead titleId={titleId} tone="accent-kicker" kicker="Import · file ready" title="Restore backup" focusTitle />
          <p className="importFile">{step.fileName}</p>
          <p className="sheet__text">{foundText(step.data)}</p>
          <SheetRows>
            <SheetRow
              tone="accent"
              title="Add to my data"
              hint="Keeps everything already on this device"
              hintUnder
              onClick={() => onAdd(step.data)}
            />
            <SheetRow
              tone="danger"
              title="Replace my data"
              hint={deletes ? `Deletes the ${deletes} on this device first` : "Nothing on this device to delete"}
              hintUnder
              onClick={() => onReplace(step.data)}
            />
          </SheetRows>
          <SecondaryButton onClick={onClose}>Cancel import</SecondaryButton>
        </>
      )}
      {step.kind === "error" && (
        <>
          {/* An error is an icon and words, never colour alone. */}
          <SheetHead
            titleId={titleId}
            tone="danger"
            kicker={
              <>
                <Icon name="warning" />
                Import
              </>
            }
            title="Can't import this file"
            focusTitle
          />
          <p className="importFile">{step.fileName}</p>
          <p className="sheet__text">{step.message}</p>
          <p className="sheet__text">Nothing on this device was changed.</p>
          <SecondaryButton onClick={onChooseFile}>Choose another file</SecondaryButton>
          <SecondaryButton onClick={onClose}>Close</SecondaryButton>
        </>
      )}
      {step.kind === "done" && (
        <>
          <SheetHead
            titleId={titleId}
            tone="accent-kicker"
            kicker={
              <>
                <Icon name="check" />
                Imported
              </>
            }
            title="Backup restored"
            focusTitle
          />
          <p className="sheet__text">{step.message}</p>
          <PrimaryButton tone="accent" onClick={onSeeStats}>
            See stats
          </PrimaryButton>
          <SecondaryButton onClick={onClose}>Done</SecondaryButton>
        </>
      )}
    </Sheet>
  );
}
