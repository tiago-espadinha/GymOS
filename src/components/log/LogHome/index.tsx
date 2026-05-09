import { useId, useState } from "react";
import { Field, PillButton } from "../../shared";
import { TrainingPlan, WorkoutSession } from "../../../types";
import RecentSessions from "./RecentSessions";
import "./LogHome.css";

interface LogHomeProps {
  plans: TrainingPlan[];
  sessions: WorkoutSession[];
  date: string;
  onDateChange: (date: string) => void;
  onStart: (plan: TrainingPlan) => void;
  onEdit: (session: WorkoutSession) => void;
  onDelete: (id: string) => void;
}

export function LogHome({ plans, sessions, date, onDateChange, onStart, onEdit, onDelete }: LogHomeProps) {
  const [planId, setPlanId] = useState("");
  const selectId = useId();
  const activePlans = plans.filter((p) => !p.isArchived);
  const chosen = activePlans.find((p) => p.id === planId);

  return (
    <>
      <form
        className="logHomeForm"
        onSubmit={(e) => {
          e.preventDefault();
          if (chosen) onStart(chosen);
        }}
      >
        <div className="logHomeSelectField">
          <label htmlFor={selectId} className="logHomeLabel">
            Training plan
          </label>
          <select
            id={selectId}
            className="logHomeSelect"
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
          >
            <option value="">Select a plan...</option>
            {activePlans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <Field label="Date" type="date" value={date} onChange={(e) => onDateChange(e.target.value)} />
        <PillButton variant="lime" type="submit" disabled={!chosen}>
          Start
        </PillButton>
      </form>

      <RecentSessions
        sessions={sessions}
        onEdit={onEdit}
        onDelete={onDelete}
        empty={
          <p className="logHomeEmptyText">
            No sessions yet. Your first one lands here after you press Start and save it.
          </p>
        }
      />
    </>
  );
}

export default LogHome;
