import { useRef, useState } from "react";
import { Button } from "../../shared";
import { TrainingPlan, WorkoutSession } from "../../../types";
import { exportToCSV, importFromCSV } from "../../../utils/csv";
import "./DataTools.css";

// Export and CSV import as they were before the Progress restyle, until they get their own screen.

interface DataToolsProps {
  plans: TrainingPlan[];
  sessions: WorkoutSession[];
  setPlans: (plans: TrainingPlan[]) => void;
  setSessions: (sessions: WorkoutSession[]) => void;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function readCsvFile(file: File): Promise<{ plans: TrainingPlan[]; sessions: WorkoutSession[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const csv = event.target?.result as string;
      if (!csv) return resolve({ plans: [], sessions: [] });
      try {
        resolve(importFromCSV(csv));
      } catch (err) {
        reject(new Error(`File "${file.name}":\n${errorMessage(err)}`));
      }
    };
    reader.readAsText(file);
  });
}

function mergePlans(plans: TrainingPlan[], imported: TrainingPlan[]): TrainingPlan[] {
  const merged = [...plans];
  imported.forEach((imp) => {
    const existing = merged.find((p) => p.name === imp.name);
    if (!existing) return void merged.push(imp);
    imp.exercises.forEach((impEx) => {
      if (!existing.exercises.find((e) => e.name === impEx.name)) existing.exercises.push(impEx);
    });
  });
  return merged;
}

function mergeSessions(sessions: WorkoutSession[], imported: WorkoutSession[]): WorkoutSession[] {
  const merged = [...sessions];
  imported.forEach((imp) => {
    // Same date, plan and notes counts as the same session.
    const isDuplicate = merged.some(
      (s) => s.date === imp.date && s.planName === imp.planName && s.notes === imp.notes,
    );
    if (!isDuplicate) merged.push(imp);
  });
  return merged;
}

export function DataTools({ plans, sessions, setPlans, setSessions }: DataToolsProps) {
  const [importState, setImportState] = useState<{
    fileCount: number;
    plans: TrainingPlan[];
    sessions: WorkoutSession[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const csv = exportToCSV(plans, sessions);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `gym_data_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetImport = () => {
    setImportState(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const results = await Promise.all(Array.from(files).map(readCsvFile));
      setImportState({
        fileCount: files.length,
        plans: results.flatMap((r) => r.plans),
        sessions: results.flatMap((r) => r.sessions),
      });
    } catch (err) {
      alert(errorMessage(err));
      resetImport();
    }
  };

  const finalizeImport = (mode: "append" | "replace") => {
    if (!importState) return;
    if (mode === "replace") {
      setPlans(importState.plans);
      setSessions(importState.sessions);
    } else {
      setPlans(mergePlans(plans, importState.plans));
      setSessions(mergeSessions(sessions, importState.sessions));
    }
    resetImport();
  };

  return (
    <div className="dataTools">
      <Button variant="ghost" small onClick={handleExport}>
        Export
      </Button>
      <Button variant="primary" small onClick={() => fileInputRef.current?.click()}>
        Import CSV
      </Button>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelection}
        accept=".csv"
        multiple
        hidden
      />

      {importState && (
        <div className="modalOverlay">
          <div className="importModal">
            <h3>Import Options</h3>
            <p>
              You are about to import {importState.fileCount} file(s) containing{" "}
              {importState.plans.length} plan(s) and {importState.sessions.length} session(s).
            </p>
            <p className="modalQuestion">Do you want to erase existing data or append to it?</p>
            <div className="modalActions">
              <Button variant="ghost" onClick={resetImport}>
                Cancel
              </Button>
              <div className="modalChoices">
                <Button variant="ghost" onClick={() => finalizeImport("append")}>
                  Append
                </Button>
                <Button variant="danger" onClick={() => finalizeImport("replace")}>
                  Erase & Replace
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
