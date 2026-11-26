import { useId } from "react";
import { BrandMark, PrimaryButton } from "../../shared";
import { TrainingPlan, WorkoutSession } from "../../../types";
import { exportToCSV } from "../../../utils/csv";
import { downloadCSV } from "../../../utils/download";
import { ImportCard } from "./ImportCard";
import { PreferenceSections } from "./PreferenceSections";
import "./SettingsScreen.css";
import { useUnitPrefs } from "../../../utils/unitPrefs";

interface SettingsScreenProps {
  plans: TrainingPlan[];
  sessions: WorkoutSession[];
  setPlans: (plans: TrainingPlan[]) => void;
  setSessions: (sessions: WorkoutSession[]) => void;
  /** Open the import file picker on arrival (the empty-state "Import it" link). */
  pickImport: boolean;
  onImportPicked: () => void;
  /** Leaves Settings for the Stats tab after an import. */
  onSeeStats: () => void;
}

function DeviceCount({ n, noun }: { n: number; noun: string }) {
  return (
    <p className="dataCount">
      <span className="dataCountFigure">{n}</span> {n === 1 ? noun : `${noun}s`}
    </p>
  );
}

/** The Settings tab: appearance, units, language and data, then About. */
export function SettingsScreen({
  plans,
  sessions,
  setPlans,
  setSessions,
  pickImport,
  onImportPicked,
  onSeeStats,
}: SettingsScreenProps) {
  const units = useUnitPrefs();
  const dataId = useId();

  return (
    <div className="dataScreen">
      <header className="dataHeader">
        <h1 className="dataTitle">Settings</h1>
      </header>

      <PreferenceSections />

      <section className="settingsSection" aria-labelledby={dataId}>
        <h2 id={dataId} className="dataKicker">
          Data
        </h2>
        <div className="dataCounts">
          <DeviceCount n={plans.length} noun="Plan" />
          <DeviceCount n={sessions.length} noun="Session" />
        </div>
        <PrimaryButton
          tone="light"
          onClick={() =>
            downloadCSV(
              exportToCSV(plans, sessions, units),
              `gym_data_${new Date().toISOString().split("T")[0]}.csv`,
            )
          }
        >
          Export CSV
        </PrimaryButton>
        <ImportCard
          plans={plans}
          sessions={sessions}
          setPlans={setPlans}
          setSessions={setSessions}
          onSeeProgress={onSeeStats}
          pickOnOpen={pickImport}
          onPicked={onImportPicked}
        />
      </section>

      <footer className="settingsAbout">
        <BrandMark className="settingsAbout__mark" />
        <div>
          <p className="settingsAbout__name">GymOS</p>
          <p className="settingsHint">Data stays on this device</p>
        </div>
      </footer>
    </div>
  );
}
