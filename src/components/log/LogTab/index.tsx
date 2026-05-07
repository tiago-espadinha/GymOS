import { useState } from "react";
import { Button, Input, Label, Select, Divider } from "../../shared";
import { generateId } from "../../../utils/id";
import { today, formatDate } from "../../../utils/date";
import { TrainingPlan, WorkoutSession, ExerciseLog, Set } from "../../../types";
import { computeMetric, getExerciseMeta } from "../../../utils/metrics";
import ExerciseLogger from "../ExerciseLogger";
import "./LogTab.css";

interface LogTabProps {
  plans: TrainingPlan[];
  sessions: WorkoutSession[];
  setSessions: (sessions: WorkoutSession[]) => void;
  initialPlan?: TrainingPlan;
}

export function LogTab({
  plans,
  sessions,
  setSessions,
  initialPlan,
}: LogTabProps) {
  const [planId, setPlanId] = useState(initialPlan?.id || "");
  const [date, setDate] = useState(today());
  const [exercises, setExercises] = useState<ExerciseLog[]>([]);
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPlanName, setEditingPlanName] = useState("");

  const emptySet = (): Set => ({ id: generateId(), weight: "", reps: "" });

  const loadPlan = (plan: TrainingPlan) => {
    setExercises(
      plan.exercises.map((ex) => ({
        ...ex,
        sets: [emptySet()],
      })),
    );
    setSaved(false);
  };

  // Load a plan handed in from the Plans tab once per plan id (state adjusted
  // during render rather than in an effect, to avoid a cascading re-render).
  const [loadedInitialPlanId, setLoadedInitialPlanId] = useState<string | null>(null);
  if (initialPlan && initialPlan.id !== loadedInitialPlanId) {
    setLoadedInitialPlanId(initialPlan.id);
    setPlanId(initialPlan.id);
    loadPlan(initialPlan);
  }

  const handlePlanChange = (id: string) => {
    setPlanId(id);
    if (editingId) {
      setEditingId(null);
      setEditingPlanName("");
    }
    const plan = plans.find((p) => p.id === id);
    if (plan) loadPlan(plan);
  };

  const startEdit = (session: WorkoutSession) => {
    setPlanId(session.planId || "");
    setDate(session.date);
    setNotes(session.notes || "");
    setEditingPlanName(session.planName);
    setEditingId(session.id);
    setSaved(false);
    setExercises(
      session.exercises.map((ex) => ({
        ...ex,
        sets: ex.sets.map((s) => ({
          ...s,
          id: s.id || generateId(),
        })),
      })),
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingPlanName("");
    setExercises([]);
    setPlanId("");
    setNotes("");
    setSaved(false);
  };

  const saveSession = () => {
    const plan = plans.find((p) => p.id === planId);
    const planName = plan?.name || editingPlanName;
    if (!planName && !editingId) return;

    const validEx = exercises
      .map((ex) => ({
        ...ex,
        sets: ex.sets.filter(
          (s) =>
            parseFloat(s.weight) > 0 ||
            parseInt(s.reps) > 0 ||
            Number(s.duration) > 0 ||
            parseFloat(s.distance || "") > 0,
        ),
      }))
      .filter((ex) => ex.sets.length > 0);

    if (validEx.length === 0) return;

    const payload: Partial<WorkoutSession> = {
      planId,
      planName: planName || editingPlanName,
      date,
      notes: notes.trim(),
      exercises: validEx,
    };

    if (editingId) {
      setSessions(
        sessions.map((s) =>
          s.id === editingId ? ({ ...s, ...payload } as WorkoutSession) : s,
        ),
      );
      cancelEdit();
    } else {
      setSessions([
        { id: generateId(), ...payload } as WorkoutSession,
        ...sessions,
      ]);
      setExercises(
        exercises.map((ex) => ({
          ...ex,
          sets: [emptySet()],
        })),
      );
      setNotes("");
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 4000);
  };

  const deleteSession = (id: string) => {
    if (window.confirm("Delete this session?")) {
      setSessions(sessions.filter((s) => s.id !== id));
      if (editingId === id) cancelEdit();
    }
  };

  const recent = sessions.slice(0, 6);

  return (
    <div>
      <div className="logTabTitle">
        {editingId ? "Edit Session" : "Log Session"}
      </div>

      {editingId && (
        <div className="logTabEditing">
          <div className="logTabEditingText">
            <span>✏</span>
            <span>
              Editing session · {editingPlanName} · {formatDate(date)}
            </span>
          </div>
          <Button onClick={cancelEdit} variant="ghost" small>
            Cancel
          </Button>
        </div>
      )}

      <div className="logTabForm">
        <div>
          <Label>Training Plan</Label>
          <Select value={planId} onChange={handlePlanChange} ariaLabel="Training plan">
            <option value="">Select a plan...</option>
            {plans
              .filter((p) => !p.isArchived || p.id === planId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.isArchived ? "(Archived)" : ""}
                </option>
              ))}
          </Select>
        </div>
        <div>
          <Label>Date</Label>
          <Input
            value={date}
            onChange={setDate}
            type="date"
            ariaLabel="Session date"
            style={{ width: "160px" }}
          />
        </div>
      </div>

      {exercises.length > 0 ? (
        <>
          <div className="logTabExercises">
            {exercises.map((ex) => (
              <ExerciseLogger
                key={ex.id}
                exercise={ex}
                onChange={(updated) =>
                  setExercises((exs) =>
                    exs.map((e) => (e.id === updated.id ? updated : e)),
                  )
                }
              />
            ))}
          </div>
          <div className="logTabNotes">
            <Label>Session Notes (optional)</Label>
            <Input
              value={notes}
              onChange={setNotes}
              placeholder="How did it go? Any PRs or setbacks?"
              ariaLabel="Session notes"
            />
          </div>
          <div className="logTabActions">
            <Button onClick={saveSession}>
              {editingId ? "Update Session" : "Save Session"}
            </Button>
            {editingId && (
              <Button onClick={cancelEdit} variant="ghost">
                Cancel
              </Button>
            )}
            {saved && (
              <span className="logTabSaved">
                {editingId ? "✓ Session updated!" : "✓ Session saved!"}
              </span>
            )}
          </div>
        </>
      ) : !planId && !editingId ? (
        <div className="logTabEmpty">
          Select a training plan to begin logging
        </div>
      ) : null}

      {recent.length > 0 && (
        <>
          <Divider />
          <div className="logTabRecentTitle">Recent Sessions</div>
          <div className="logTabRecentList">
            {recent.map((s) => {
              const isEditing = editingId === s.id;
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
                    border: `1px solid ${isEditing ? "var(--color-accent)" : "var(--color-line)"}`,
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
                      {!isEditing ? (
                        <Button
                          onClick={() => startEdit(s)}
                          variant="ghost"
                          small
                        >
                          Edit
                        </Button>
                      ) : (
                        <span className="logTabEditingIndicator">Editing…</span>
                      )}
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
