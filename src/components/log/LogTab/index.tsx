import { useEffect, useRef, useState } from "react";
import { Button, Input, Label } from "../../shared";
import { today, formatDate } from "../../../utils/date";
import { ExerciseLog, TrainingPlan, WorkoutSession } from "../../../types";
import {
  ActiveSession,
  fromPlan,
  fromSaved,
  hasLoggedSets,
  isLoggedSet,
} from "../../../utils/activeSession";
import { generateId } from "../../../utils/id";
import LogHome from "../LogHome";
import SessionList from "../SessionList";
import "./LogTab.css";

interface LogTabProps {
  plans: TrainingPlan[];
  sessions: WorkoutSession[];
  setSessions: (sessions: WorkoutSession[]) => void;
  session: ActiveSession | null;
  onBegin: (session: ActiveSession) => void;
  onUpdate: (patch: Partial<ActiveSession>) => void;
  onUpdateExercise: (exercise: ExerciseLog) => void;
  onEnd: () => void;
}

export function LogTab({
  plans,
  sessions,
  setSessions,
  session,
  onBegin,
  onUpdate,
  onUpdateExercise,
  onEnd,
}: LogTabProps) {
  const [homeDate, setHomeDate] = useState(today());
  const [saved, setSaved] = useState("");

  const titleRef = useRef<HTMLHeadingElement>(null);
  const inSession = Boolean(session);

  // Starting or ending a session removes the button that was focused, so move
  // focus to the title instead of letting it fall back to the top of the page.
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current || inSession) titleRef.current?.focus();
    mounted.current = true;
  }, [inSession]);

  const editingId = session?.editingId;

  const startPlan = (plan: TrainingPlan) => {
    setSaved("");
    onBegin(fromPlan(plan, homeDate));
  };

  const startEdit = (previous: WorkoutSession) => {
    setSaved("");
    onBegin(fromSaved(previous));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelSession = () => {
    if (session && hasLoggedSets(session)) {
      const question = editingId ? "Discard your changes?" : "Discard this session?";
      if (!window.confirm(question)) return;
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

  return (
    <div>
      <h1 className={session ? "logTabTitle" : "logTabTitle logTabTitle--home"} ref={titleRef} tabIndex={-1}>
        {editingId ? "Edit Session" : session ? "Log Session" : "Log"}
      </h1>

      <div role="status" className="logTabSaved">
        {saved}
      </div>

      {session?.editingId && (
        <div className="logTabEditing">
          <div className="logTabEditingText">
            <span>✏</span>
            <span>
              Editing session · {session.planName} · {formatDate(session.date)}
            </span>
          </div>
        </div>
      )}

      {session && (
        <div className="logTabForm">
          <div className="logTabPlanName">{session.planName}</div>
          <div>
            <Label>Date</Label>
            <Input
              value={session.date}
              onChange={(d) => onUpdate({ date: d })}
              type="date"
              ariaLabel="Session date"
              style={{ width: "160px" }}
            />
          </div>
        </div>
      )}

      {session ? (
        <>
          <SessionList exercises={session.exercises} onChangeExercise={onUpdateExercise} />
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
        <LogHome
          plans={plans}
          sessions={sessions}
          date={homeDate}
          onDateChange={setHomeDate}
          onStart={startPlan}
          onEdit={startEdit}
          onDelete={deleteSession}
        />
      )}
    </div>
  );
}

export default LogTab;
