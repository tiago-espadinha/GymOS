import { useId, useState } from "react";
import { Field, ListRow, PillButton } from "../../shared";
import { formatDate } from "../../../utils/date";
import { sessionStats, sessionSummary } from "../../../utils/sessions";
import { TrainingPlan, WorkoutSession } from "../../../types";
import "./LogHome.css";

const RECENT_COUNT = 6;

interface LogHomeProps {
  plans: TrainingPlan[];
  sessions: WorkoutSession[];
  date: string;
  onDateChange: (date: string) => void;
  onStart: (plan: TrainingPlan) => void;
  onEdit: (session: WorkoutSession) => void;
  onDelete: (id: string) => void;
}

function RecentSessions({
  sessions,
  onEdit,
  onDelete,
}: {
  sessions: WorkoutSession[];
  onEdit: (session: WorkoutSession) => void;
  onDelete: (id: string) => void;
}) {
  if (sessions.length === 0) return null;
  return (
    <section aria-labelledby="logHomeRecentTitle">
      <h2 id="logHomeRecentTitle" className="logHomeLabel">
        Recent sessions
      </h2>
      <ul className="logHomeList" role="list">
        {sessions.map((s) => {
          const when = formatDate(s.date);
          return (
            <li key={s.id} className="logHomeItem">
              <ListRow
                title={s.planName}
                subtitle={sessionSummary(when, sessionStats(s))}
                trailing={
                  <PillButton variant="outline-white" onClick={() => onEdit(s)} aria-label={`Edit ${s.planName}, ${when}`}>
                    Edit
                  </PillButton>
                }
              />
              {s.notes && <p className="logHomeNotes">{s.notes}</p>}
              <div className="logHomeActions">
                <PillButton variant="outline-white" onClick={() => onDelete(s.id)} aria-label={`Delete ${s.planName}, ${when}`}>
                  Delete
                </PillButton>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function LogHome({ plans, sessions, date, onDateChange, onStart, onEdit, onDelete }: LogHomeProps) {
  const [planId, setPlanId] = useState("");
  const selectId = useId();
  const activePlans = plans.filter((p) => !p.isArchived);
  const chosen = activePlans.find((p) => p.id === planId);
  const recent = sessions.slice(0, RECENT_COUNT);

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

      <p className="logHomeEmpty">Select a training plan to begin logging</p>

      <RecentSessions sessions={recent} onEdit={onEdit} onDelete={onDelete} />
    </>
  );
}

export default LogHome;
