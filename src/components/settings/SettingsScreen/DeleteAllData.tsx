import { useState } from "react";
import { ConfirmSheet } from "../../shared";

interface DeleteAllDataProps {
  /** "1 plan and 2 sessions": what goes. */
  onDevice: string;
  onExport: () => void;
  onDelete: () => void;
}

/** "Delete all data" under the backup card, and the sheet that confirms it. */
export function DeleteAllData({ onDevice, onExport, onDelete }: DeleteAllDataProps) {
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      <button type="button" className="textLink dataDelete" onClick={() => setConfirming(true)}>
        Delete all data
      </button>
      {confirming && (
        <ConfirmSheet
          kicker="Delete for good"
          title="Delete all data?"
          text={
            <>
              {onDevice} are removed from this device and can't be restored. Your accent, units and timer settings stay.{" "}
              <button type="button" className="textLink dataExportFirst" onClick={onExport}>
                Export a backup first
              </button>
            </>
          }
          confirmLabel="Delete everything"
          onConfirm={onDelete}
          onClose={() => setConfirming(false)}
        />
      )}
    </>
  );
}
