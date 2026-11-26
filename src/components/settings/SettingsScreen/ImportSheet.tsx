import { useId } from "react";
import { Icon, PrimaryButton, Sheet } from "../../shared";
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
  /** Cancel import, Done, Escape or a tap outside. Nothing is written. */
  onClose: () => void;
}

/** The heading takes focus on each step, so a stray tap or Enter never lands on a choice. */
export function ImportSheet({ step, deletes, onAdd, onReplace, onChooseFile, onSeeStats, onClose }: ImportSheetProps) {
  const titleId = useId();
  return (
    <Sheet labelledBy={titleId} onClose={onClose}>
      {step.kind === "ready" && (
        <>
          <span className="sheet__kicker importKicker--accent">Import · file ready</span>
          <h2 id={titleId} className="sheet__title importTitle" tabIndex={-1} data-autofocus>Restore backup</h2>
          <p className="importFile">{step.fileName}</p>
          <p className="sheet__text">{foundText(step.data)}</p>
          <button type="button" className="importChoice importChoice--add" onClick={() => onAdd(step.data)}>
            <span className="importChoiceTitle">Add to my data</span>
            <span className="importChoiceHint">Keeps everything already on this device</span>
          </button>
          <button type="button" className="importChoice importChoice--replace" onClick={() => onReplace(step.data)}>
            <span className="importChoiceTitle">Replace my data</span>
            <span className="importChoiceHint">
              {deletes ? `Deletes the ${deletes} on this device first` : "Nothing on this device to delete"}
            </span>
          </button>
          <button type="button" className="sheet__cancel" onClick={onClose}>
            Cancel import
          </button>
        </>
      )}
      {step.kind === "error" && (
        <>
          {/* An error is an icon and words, never colour alone. */}
          <h2 id={titleId} className="sheet__kicker sheet__kicker--danger importKicker importTitle" tabIndex={-1} data-autofocus>
            <Icon name="warning" />
            Can't import this file
          </h2>
          <p className="importFile">{step.fileName}</p>
          <p className="importMessage">{step.message}</p>
          <p className="sheet__text">Nothing on this device was changed.</p>
          <button type="button" className="importAnother" onClick={onChooseFile}>
            Choose another file
          </button>
        </>
      )}
      {step.kind === "done" && (
        <>
          <span className="sheet__kicker importKicker importKicker--accent">
            <Icon name="check" />
            Imported
          </span>
          <h2 id={titleId} className="sheet__title importTitle" tabIndex={-1} data-autofocus>Backup restored</h2>
          <p className="importMessage">{step.message}</p>
          <PrimaryButton tone="accent" onClick={onSeeStats}>
            See stats
          </PrimaryButton>
          <button type="button" className="sheet__cancel" onClick={onClose}>
            Done
          </button>
        </>
      )}
    </Sheet>
  );
}
