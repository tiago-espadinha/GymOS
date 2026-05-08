import { useEffect, useId, useRef } from "react";
import { PrimaryButton } from "../../shared";
import { TrainingPlan, WorkoutSession } from "../../../types";
import { exportToCSV } from "../../../utils/csv";
import { downloadCSV } from "../../../utils/download";
import { ImportCard } from "./ImportCard";
import "./DataScreen.css";

interface DataScreenProps {
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

/** Export and import, opened from Progress. */
export function DataScreen({ plans, sessions, setPlans, setSessions, onClose }: DataScreenProps) {
  const title = useRef<HTMLHeadingElement>(null);
  const deviceId = useId();
  useEffect(() => title.current?.focus(), []);

  return (
    <div className="dataScreen">
      <header className="dataHeader">
        <h1 ref={title} className="dataTitle" tabIndex={-1}>
          Data
        </h1>
        <button type="button" className="dataClose" onClick={onClose}>
          Close
        </button>
      </header>

      <section className="dataDevice" aria-labelledby={deviceId}>
        <h2 id={deviceId} className="dataKicker">
          On this device
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
      </section>

      <ImportCard plans={plans} sessions={sessions} setPlans={setPlans} setSessions={setSessions} />
    </div>
  );
}
