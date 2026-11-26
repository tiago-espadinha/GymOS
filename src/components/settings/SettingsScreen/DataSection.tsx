import { useEffect, useId, useRef, useState } from "react";
import { TrainingPlan, WorkoutSession } from "../../../types";
import { CSVImport, exportToCSV } from "../../../utils/csv";
import { downloadCSV } from "../../../utils/download";
import { mergeImport } from "../../../utils/importData";
import { useUnitPrefs } from "../../../utils/unitPrefs";
import { ImportSheet } from "./ImportSheet";
import { ImportStep, readImport } from "./readImport";
import { addedText, count, plansAndSessions } from "./importSummary";

interface DataSectionProps {
  plans: TrainingPlan[];
  sessions: WorkoutSession[];
  setPlans: (plans: TrainingPlan[]) => void;
  setSessions: (sessions: WorkoutSession[]) => void;
  /** Open the file picker on arrival, still inside the tap that asked for it. */
  pickImport: boolean;
  onImportPicked: () => void;
  onSeeStats: () => void;
}

/** The backup card. It never changes during an import: each step opens in a sheet. */
export function DataSection({ plans, sessions, setPlans, setSessions, pickImport, onImportPicked, onSeeStats }: DataSectionProps) {
  const units = useUnitPrefs();
  const headingId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  // The id remounts the sheet on each step, so focus lands on that step's first control.
  const [step, setStep] = useState<{ id: number; value: ImportStep } | null>(null);
  const show = (value: ImportStep) => setStep((prev) => ({ id: (prev?.id ?? 0) + 1, value }));

  const chooseFile = () => fileInput.current?.click();

  useEffect(() => {
    if (!pickImport) return;
    onImportPicked();
    fileInput.current?.click();
  }, [pickImport, onImportPicked]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) show(await readImport(file));
  };

  const exportData = () =>
    downloadCSV(exportToCSV(plans, sessions, units), `gym_data_${new Date().toISOString().split("T")[0]}.csv`);

  const add = (data: CSVImport) => {
    const merged = mergeImport(plans, sessions, data);
    setPlans(merged.plans);
    setSessions(merged.sessions);
    const alreadyHere = data.sessions.length - merged.addedSessions;
    show({ kind: "done", message: addedText(merged.addedPlans, merged.addedSessions, alreadyHere) });
  };

  const replace = (data: CSVImport) => {
    setPlans(data.plans);
    setSessions(data.sessions);
    show({ kind: "done", message: `Replaced with ${plansAndSessions(data.plans.length, data.sessions.length)}.` });
  };

  const hasData = plans.length > 0 || sessions.length > 0;

  return (
    <section className="settingsSection" aria-labelledby={headingId}>
      <h2 id={headingId} className="dataKicker">
        Data
      </h2>
      <div className="dataCard">
        <p className="dataKicker">On this device</p>
        <p className="dataCard__counts">
          {count(plans.length, "plan")} · {count(sessions.length, "session")}
        </p>
        <div className="dataCard__actions">
          <button type="button" className="dataCard__action" onClick={exportData}>
            Export
          </button>
          <button type="button" className="dataCard__action" onClick={chooseFile}>
            Import
          </button>
        </div>
        <p className="settingsHint">Export saves a CSV. Import lets you add to or replace what's here.</p>
      </div>
      <input ref={fileInput} type="file" accept=".csv,text/csv" onChange={handleFile} hidden />
      {step && (
        <ImportSheet
          key={step.id}
          step={step.value}
          deletes={hasData ? plansAndSessions(plans.length, sessions.length) : null}
          onAdd={add}
          onReplace={replace}
          onChooseFile={chooseFile}
          onSeeStats={onSeeStats}
          onClose={() => setStep(null)}
        />
      )}
    </section>
  );
}
