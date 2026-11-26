import { useEffect, useId, useRef, useState } from "react";
import { CheckIcon, WarningIcon } from "../../shared";
import { TrainingPlan, WorkoutSession } from "../../../types";
import { CSVImport, importFromCSV } from "../../../utils/csv";
import { mergeImport } from "../../../utils/importData";
import { addedText, foundText, nothingFoundText, plansAndSessions } from "./importSummary";

interface ImportCardProps {
  plans: TrainingPlan[];
  sessions: WorkoutSession[];
  setPlans: (plans: TrainingPlan[]) => void;
  setSessions: (sessions: WorkoutSession[]) => void;
  /** See stats: leaves Settings. */
  onSeeProgress: () => void;
  /** Open the file picker on mount, still inside the tap that asked for it. */
  pickOnOpen: boolean;
  onPicked: () => void;
}

type ImportState =
  | { kind: "idle" }
  | { kind: "ready"; fileName: string; data: CSVImport }
  | { kind: "error"; fileName: string; message: string }
  | { kind: "done"; fileName: string; message: string };

const KICKER: Record<ImportState["kind"], string> = {
  idle: "Import",
  ready: "Import · file ready",
  error: "Can't import this file",
  done: "Imported",
};

async function readImport(file: File): Promise<ImportState> {
  try {
    const data = importFromCSV(await file.text());
    if (!data.plans.length && !data.sessions.length) {
      return { kind: "error", fileName: file.name, message: nothingFoundText(data.skippedRows) };
    }
    return { kind: "ready", fileName: file.name, data };
  } catch (err) {
    return { kind: "error", fileName: file.name, message: err instanceof Error ? err.message : String(err) };
  }
}

interface ImportChoicesProps {
  onAdd: () => void;
  onReplace: () => void;
  onCancel: () => void;
  /** What Replace deletes, or null when the device holds nothing. */
  deletes: string | null;
}

function ImportChoices({ onAdd, onReplace, onCancel, deletes }: ImportChoicesProps) {
  return (
    <>
      <button type="button" className="importChoice importChoice--add" onClick={onAdd}>
        <span className="importChoiceTitle">Add to my data</span>
        <span className="importChoiceHint">Keeps everything already on this device</span>
      </button>
      <button type="button" className="importChoice importChoice--replace" onClick={onReplace}>
        <span className="importChoiceTitle">Replace my data</span>
        <span className="importChoiceHint">
          {deletes ? `Deletes the ${deletes} on this device first` : "Nothing on this device to delete"}
        </span>
      </button>
      <button type="button" className="importCancel" onClick={onCancel}>
        Cancel import
      </button>
    </>
  );
}

export function ImportCard({ plans, sessions, setPlans, setSessions, onSeeProgress, pickOnOpen, onPicked }: ImportCardProps) {
  const [state, setState] = useState<ImportState>({ kind: "idle" });
  const fileInput = useRef<HTMLInputElement>(null);
  const kickerId = useId();
  const kicker = useRef<HTMLHeadingElement>(null);

  // The focused button is replaced on each step (choose, add, replace, cancel), so focus moves to the card's heading instead of the page.
  const settle = (next: ImportState) => {
    setState(next);
    kicker.current?.focus();
  };

  const chooseFile = () => fileInput.current?.click();

  useEffect(() => {
    if (!pickOnOpen) return;
    onPicked();
    fileInput.current?.click();
  }, [pickOnOpen, onPicked]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) settle(await readImport(file));
  };

  const add = (fileName: string, data: CSVImport) => {
    const merged = mergeImport(plans, sessions, data);
    setPlans(merged.plans);
    setSessions(merged.sessions);
    const alreadyHere = data.sessions.length - merged.addedSessions;
    settle({ kind: "done", fileName, message: addedText(merged.addedPlans, merged.addedSessions, alreadyHere) });
  };

  const replace = (fileName: string, data: CSVImport) => {
    setPlans(data.plans);
    setSessions(data.sessions);
    const message = `Replaced with ${plansAndSessions(data.plans.length, data.sessions.length)}.`;
    settle({ kind: "done", fileName, message });
  };

  return (
    <section className={`importCard importCard--${state.kind}`} aria-labelledby={kickerId}>
      <h3 ref={kicker} id={kickerId} className="dataKicker importCardKicker" tabIndex={-1}>
        {state.kind === "error" && <WarningIcon />}
        {state.kind === "done" && <CheckIcon />}
        {KICKER[state.kind]}
      </h3>
      <div className="importCardBody" aria-live="polite">
        {state.kind === "idle" && (
          <p className="importCardText">
            Bring in a CSV exported from GymOS. You choose whether it adds to or replaces what's here.
          </p>
        )}
        {state.kind !== "idle" && <p className="importCardFile">{state.fileName}</p>}
        {state.kind === "ready" && <p className="importCardText">{foundText(state.data)}</p>}
        {state.kind === "error" && (
          <>
            <p className="importCardMessage">{state.message}</p>
            <p className="importCardText">Nothing on this device was changed.</p>
          </>
        )}
        {state.kind === "done" && <p className="importCardMessage">{state.message}</p>}
      </div>

      {state.kind === "idle" && (
        <button type="button" className="importPick" onClick={chooseFile}>
          Choose a CSV file
        </button>
      )}
      {state.kind === "ready" && (
        <ImportChoices
          onAdd={() => add(state.fileName, state.data)}
          onReplace={() => replace(state.fileName, state.data)}
          onCancel={() => settle({ kind: "idle" })}
          deletes={plans.length || sessions.length ? plansAndSessions(plans.length, sessions.length) : null}
        />
      )}
      {state.kind === "error" && (
        <button type="button" className="importAction importAction--outline" onClick={chooseFile}>
          Choose another file
        </button>
      )}
      {state.kind === "done" && (
        <>
          <button type="button" className="importAction importAction--accent" onClick={onSeeProgress}>
            See stats
          </button>
          <button type="button" className="importCancel" onClick={chooseFile}>
            Import another file
          </button>
        </>
      )}
      <input ref={fileInput} type="file" accept=".csv,text/csv" onChange={handleFile} hidden />
    </section>
  );
}
