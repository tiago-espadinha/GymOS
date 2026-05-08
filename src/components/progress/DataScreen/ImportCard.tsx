import { useId, useRef, useState } from "react";
import { PillButton } from "../../shared";
import { TrainingPlan, WorkoutSession } from "../../../types";
import { CSVImport, importFromCSV } from "../../../utils/csv";
import { mergeImport } from "../../../utils/importData";
import { addedText, foundText, nothingFoundText, plansAndSessions } from "./importSummary";

interface ImportCardProps {
  plans: TrainingPlan[];
  sessions: WorkoutSession[];
  setPlans: (plans: TrainingPlan[]) => void;
  setSessions: (sessions: WorkoutSession[]) => void;
}

type ImportState =
  | { kind: "idle" }
  | { kind: "ready"; fileName: string; data: CSVImport }
  | { kind: "error"; fileName: string; message: string }
  | { kind: "done"; message: string };

const KICKER: Record<ImportState["kind"], string> = {
  idle: "Import",
  ready: "Import · file ready",
  error: "Import · could not read",
  done: "Import · done",
};

const CHOOSE_LABEL: Record<Exclude<ImportState["kind"], "ready">, string> = {
  idle: "Choose CSV file",
  error: "Choose another file",
  done: "Import another file",
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

export function ImportCard({ plans, sessions, setPlans, setSessions }: ImportCardProps) {
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

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) settle(await readImport(file));
  };

  const add = (data: CSVImport) => {
    const merged = mergeImport(plans, sessions, data);
    setPlans(merged.plans);
    setSessions(merged.sessions);
    settle({ kind: "done", message: addedText(merged.addedPlans, merged.addedSessions) });
  };

  const replace = (data: CSVImport) => {
    setPlans(data.plans);
    setSessions(data.sessions);
    settle({ kind: "done", message: `Replaced with ${plansAndSessions(data.plans.length, data.sessions.length)}.` });
  };

  return (
    <section className={`importCard importCard--${state.kind}`} aria-labelledby={kickerId}>
      <h2 ref={kicker} id={kickerId} className="dataKicker importCardKicker" tabIndex={-1}>
        {KICKER[state.kind]}
      </h2>
      <div className="importCardBody" aria-live="polite">
        {state.kind === "idle" && (
          <p className="importCardText">
            Choose a CSV exported from GymOS. Nothing changes until you choose to add or replace.
          </p>
        )}
        {(state.kind === "ready" || state.kind === "error") && <p className="importCardFile">{state.fileName}</p>}
        {state.kind === "ready" && <p className="importCardText">{foundText(state.data)}</p>}
        {state.kind === "error" && <p className="importCardText importCardText--error">{state.message}</p>}
        {state.kind === "done" && <p className="importCardFile">{state.message}</p>}
      </div>

      {state.kind === "ready" ? (
        <ImportChoices
          onAdd={() => add(state.data)}
          onReplace={() => replace(state.data)}
          onCancel={() => settle({ kind: "idle" })}
          deletes={plans.length || sessions.length ? plansAndSessions(plans.length, sessions.length) : null}
        />
      ) : (
        <PillButton variant="outline-white" onClick={chooseFile}>
          {CHOOSE_LABEL[state.kind]}
        </PillButton>
      )}
      <input ref={fileInput} type="file" accept=".csv,text/csv" onChange={handleFile} hidden />
    </section>
  );
}
