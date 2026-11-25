import { useEffect, useId, useRef } from "react";
import { PrimaryButton } from "../../shared";
import { TrainingPlan, WorkoutSession } from "../../../types";
import { exportToCSV } from "../../../utils/csv";
import { downloadCSV } from "../../../utils/download";
import { ImportCard } from "./ImportCard";
import { PreferenceSections } from "./PreferenceSections";
import "./SettingsScreen.css";

interface SettingsScreenProps {
  plans: TrainingPlan[];
  sessions: WorkoutSession[];
  setPlans: (plans: TrainingPlan[]) => void;
  setSessions: (sessions: WorkoutSession[]) => void;
  onClose: () => void;
}

function DeviceCount({ n, noun }: { n: number; noun: string }) {
  return (
    <p className="dataCount">
      <span className="dataCountFigure">{n}</span> {n === 1 ? noun : `${noun}s`}
    </p>
  );
}

/** Data, language, units and appearance on one screen, opened from Progress or an empty-state import link. */
export function SettingsScreen({ plans, sessions, setPlans, setSessions, onClose }: SettingsScreenProps) {
  const title = useRef<HTMLHeadingElement>(null);
  const dataId = useId();
  useEffect(() => title.current?.focus(), []);

  return (
    <div className="dataScreen">
      <header className="dataHeader">
        <h1 ref={title} className="dataTitle" tabIndex={-1}>
          Settings
        </h1>
        <button type="button" className="dataClose" onClick={onClose}>
          Close
        </button>
      </header>

      <section className="settingsSection" aria-labelledby={dataId}>
        <h2 id={dataId} className="dataKicker">
          Data
        </h2>
        <div className="dataCounts">
          <DeviceCount n={plans.length} noun="plan" />
          <DeviceCount n={sessions.length} noun="session" />
        </div>
        <PrimaryButton tone="light" onClick={() =>
            downloadCSV(exportToCSV(plans, sessions), `gym_data_${new Date().toISOString().split("T")[0]}.csv`)
          }>
          Export CSV
        </PrimaryButton>
        <ImportCard
          plans={plans}
          sessions={sessions}
          setPlans={setPlans}
          setSessions={setSessions}
          onSeeProgress={onClose}
        />
      </section>

      <PreferenceSections />
    </div>
  );
}
