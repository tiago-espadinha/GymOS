import { useEffect, useId, useRef, useState } from "react";
import { TrainingPlan, WorkoutSession } from "../../../types";
import { CSVImport, exportToCSV } from "../../../utils/csv";
import { downloadCSV } from "../../../utils/download";
import { mergeImport } from "../../../utils/importData";
import { useUnitPrefs } from "../../../utils/unitPrefs";
import { SecondaryButton } from "../../shared";
import { DeleteAllData } from "./DeleteAllData";
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
  onPickImportHandled: () => void;
  onSeeStats: () => void;
}

/** The backup card. It never changes during an import: each step opens in a sheet. */
export function DataSection({ plans, sessions, setPlans, setSessions, pickImport, onPickImportHandled, onSeeStats }: DataSectionProps) {
  const units = useUnitPrefs();
  const headingId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  // The id remounts the sheet on each step, so focus moves to that step's heading.
  const [step, setStep] = useState<{ id: number; value: ImportStep } | null>(null);
  const show = (value: ImportStep) => setStep((prev) => ({ id: (prev?.id ?? 0) + 1, value }));
  const importButton = useRef<HTMLButtonElement>(null);
  // Delete all removes its own link, so focus goes to Import once the sheet has closed and the page is live again.
  const focusImport = useRef(false);
  useEffect(() => {
    if (!focusImport.current) return;
    focusImport.current = false;
    importButton.current?.focus();
  });

  const chooseFile = () => fileInput.current?.click();

  useEffect(() => {
    if (!pickImport) return;
    onPickImportHandled();
    // The link that asked is gone with the old tab, so the sheets return focus here.
    importButton.current?.focus();
    fileInput.current?.click();
  }, [pickImport, onPickImportHandled]);

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

  // Plans and sessions only: accent, units and other preferences stay.
  const deleteAll = () => {
    setPlans([]);
    setSessions([]);
    focusImport.current = true;
  };

  const hasData = plans.length > 0 || sessions.length > 0;
  const onDevice = plansAndSessions(plans.length, sessions.length);

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
          <SecondaryButton onClick={exportData}>Export</SecondaryButton>
          <SecondaryButton ref={importButton} onClick={chooseFile}>
            Import
          </SecondaryButton>
        </div>
        <p className="settingsHint">Export saves a CSV. Import lets you add to or replace what's here.</p>
      </div>
      {hasData && <DeleteAllData onDevice={onDevice} onExport={exportData} onDelete={deleteAll} />}
      <input ref={fileInput} type="file" accept=".csv,text/csv" onChange={handleFile} hidden />
      {step && (
        <ImportSheet
          key={step.id}
          step={step.value}
          deletes={hasData ? onDevice : null}
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
