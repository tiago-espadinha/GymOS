import { useState } from "react";
import { Button, Input, Label, Select, Divider } from "../../shared";
import { today, formatDate } from "../../../utils/date";
import { TrainingPlan, WorkoutSession } from "../../../types";
import { computeMetric, getExerciseMeta } from "../../../utils/metrics";
import {
  ActiveSession,
  fromPlan,
  fromSaved,
  hasLoggedSets,
  isLoggedSet,
} from "../../../utils/activeSession";
import { generateId } from "../../../utils/id";
import ExerciseLogger from "../ExerciseLogger";
import "./LogTab.css";

interface LogTabProps {
  plans: TrainingPlan[];
  sessions: WorkoutSession[];
  setSessions: (sessions: WorkoutSession[]) => void;
  session: ActiveSession | null;
  onBegin: (session: ActiveSession) => void;
  onUpdate: (patch: Partial<ActiveSession>) => void;
  onEnd: () => void;
}

export function LogTab({
  plans,
  sessions,
  setSessions,
  session,
  onBegin,
  onUpdate,
  onEnd,
}: LogTabProps) {
  const [homeDate, setHomeDate] = useState(today());
  const [saved, setSaved] = useState("");

  const editingId = session?.editingId;
  const date = session ? session.date : homeDate;

  const handlePlanChange = (id: string) => {
    const plan = plans.find((p) => p.id === id);
    if (!plan) return;
    setSaved("");
    onBegin(fromPlan(plan, homeDate));
  };

  const startEdit = (previous: WorkoutSession) => {
    setSaved("");
    onBegin(fromSaved(previous));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelSession = () => {
    if (session && hasLoggedSets(session) && !window.confirm("Discard this session?")) {
      return;
    }
    onEnd();
  };

  const saveSession = () => {
    if (!session) return;

    const validEx = session.exercises
      .map((ex) => ({ ...ex, sets: ex.sets.filter(isLoggedSet) }))
      .filter((ex) => ex.sets.length > 0);

    if (validEx.length === 0) return;

    const payload = {
      planId: session.planId,
      planName: session.planName,
      date: session.date,
      notes: session.notes.trim(),
      exercises: validEx,
    };

    if (editingId) {
      setSessions(
        sessions.map((s) => (s.id === editingId ? { ...s, ...payload } : s)),
      );
    } else {
      setSessions([{ id: generateId(), ...payload }, ...sessions]);
    }
    setSaved(editingId ? "✓ Session updated!" : "✓ Session saved!");
    setTimeout(() => setSaved(""), 4000);
    onEnd();
  };

  const deleteSession = (id: string) => {
    if (window.confirm("Delete this session?")) {
      setSessions(sessions.filter((s) => s.id !== id));
    }
  };

  const recent = sessions.slice(0, 6);

  return (
    <div>
      <div className="logTabTitle">
        {editingId ? "Edit Session" : "Log Session"}
      </div>

      {saved && <div className="logTabSaved">{saved}</div>}

      {editingId && session && (
        <div className="logTabEditing">
          <div className="logTabEditingText">
            <span>✏</span>
            <span>
              Editing session · {session.planName} · {formatDate(date)}
            </span>
          </div>
        </div>
      )}

      <div className="logTabForm">
        {session ? (
          <div className="logTabPlanName">{session.planName}</div>
        ) : (
          <div>
            <Label>Training Plan</Label>
            <Select value="" onChange={handlePlanChange} ariaLabel="Training plan">
              <option value="">Select a plan...</option>
              {plans
                .filter((p) => !p.isArchived)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </Select>
          </div>
        )}
        <div>
          <Label>Date</Label>
          <Input
            value={date}
            onChange={(d) => (session ? onUpdate({ date: d }) : setHomeDate(d))}
            type="date"
            ariaLabel="Session date"
            style={{ width: "160px" }}
          />
        </div>
      </div>

      {session ? (
        <>
          <div className="logTabExercises">
            {session.exercises.map((ex) => (
              <ExerciseLogger
                key={ex.id}
                exercise={ex}
                onChange={(updated) =>
                  onUpdate({
                    exercises: session.exercises.map((e) =>
                      e.id === updated.id ? updated : e,
                    ),
                  })
                }
              />
            ))}
          </div>
          <div className="logTabNotes">
            <Label>Session Notes (optional)</Label>
            <Input
              value={session.notes}
              onChange={(notes) => onUpdate({ notes })}
              placeholder="How did it go? Any PRs or setbacks?"
              ariaLabel="Session notes"
            />
          </div>
          <div className="logTabActions">
            <Button onClick={saveSession}>
              {editingId ? "Update Session" : "Save Session"}
            </Button>
            <Button onClick={cancelSession} variant="ghost">
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <div className="logTabEmpty">
          Select a training plan to begin logging
        </div>
      )}

      {!session && recent.length > 0 && (
        <>
          <Divider />
          <div className="logTabRecentTitle">Recent Sessions</div>
          <div className="logTabRecentList">
            {recent.map((s) => {
              const totalVol = s.exercises.reduce(
                (sum, ex) =>
                  sum +
                  ex.sets.reduce(
                    (sv, st) =>
                      sv +
                      (parseFloat(st.weight) || 0) * (parseInt(st.reps) || 0),
                    0,
                  ),
                0,
              );
              return (
                <div
                  key={s.id}
                  className="logTabRecentItem"
                  style={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-line)",
                  }}
                >
                  <div className="logTabRecentHeader">
                    <div className="logTabRecentInfo">
                      <span className="logTabRecentPlanName">{s.planName}</span>
                      {s.notes && (
                        <span className="logTabRecentNotes">{s.notes}</span>
                      )}
                    </div>
                    <div className="logTabRecentData">
                      {totalVol > 0 && (
                        <span className="logTabRecentVolume">
                          {totalVol.toFixed(0)} kg
                        </span>
                      )}
                      <span className="logTabRecentDate">
                        {formatDate(s.date)}
                      </span>
                    </div>
                    <div className="logTabRecentActions">
                      <Button onClick={() => startEdit(s)} variant="ghost" small>
                        Edit
                      </Button>
                      <button
                        onClick={() => deleteSession(s.id)}
                        className="logTabDeleteButton"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <div className="logTabRecentExercises">
                    {s.exercises.map((ex) => {
                      const avg = computeMetric(ex.sets, getExerciseMeta(ex), "average");
                      return (
                        <div key={ex.id} className="logTabRecentExercise">
                          {ex.name}:{" "}
                          <span className="logTabRecentExerciseWeight">
                            {avg ? avg.label : "—"}
                          </span>
                          <span className="logTabRecentExerciseSets">
                            {" "}
                            ×{ex.sets.length}s
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default LogTab;
