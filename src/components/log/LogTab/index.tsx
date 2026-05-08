import { useEffect, useRef, useState } from "react";
import { Input, Label, PillButton } from "../../shared";
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
import { clearSessionRests } from "../../../utils/restTimers";
import FinishScreen from "../FinishScreen";
import LogHome from "../LogHome";
import SessionList from "../SessionList";
import "./LogTab.css";

const FINISH_ID = "logTabFinish";

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
  const [finishing, setFinishing] = useState(false);

  const titleRef = useRef<HTMLHeadingElement>(null);
  const inSession = Boolean(session);

  // Starting or ending a session removes the button that was focused, so move
  // focus to the title instead of letting it fall back to the top of the page.
  // Back to logging returns to the Finish pill that opened the Done screen.
  const mounted = useRef(false);
  const backFromFinish = useRef(false);
  useEffect(() => {
    if (backFromFinish.current) document.getElementById(FINISH_ID)?.focus();
    else if (mounted.current || inSession) titleRef.current?.focus();
    backFromFinish.current = false;
    mounted.current = true;
  }, [inSession, finishing]);

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
    if (session) clearSessionRests(session.exercises);
    setFinishing(false);
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
    clearSessionRests(session.exercises);
    setFinishing(false);
    onEnd();
  };

  const deleteSession = (id: string) => {
    if (window.confirm("Delete this session?")) {
      setSessions(sessions.filter((s) => s.id !== id));
    }
  };

  const canFinish = session ? hasLoggedSets(session) : false;

  // The status region stays mounted while the Done screen shows, so a save
  // message that appears on Save is announced.
  return (
    <div>
      {!(session && finishing) && (
        <h1 className={session ? "logTabTitle" : "logTabTitle logTabTitle--home"} ref={titleRef} tabIndex={-1}>
          {editingId ? "Edit Session" : session ? "Log Session" : "Log"}
        </h1>
      )}

      <div role="status" className="logTabSaved">
        {saved}
      </div>

      {session && finishing ? (
        <FinishScreen
          session={session}
          onNotes={(notes) => onUpdate({ notes })}
          onSave={saveSession}
          onBack={() => {
            backFromFinish.current = true;
            setFinishing(false);
          }}
          onCancel={cancelSession}
        />
      ) : (
        <>
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
              <div className="logTabActions">
                <PillButton
                  id={FINISH_ID}
                  variant="outline-white"
                  onClick={() => setFinishing(true)}
                  disabled={!canFinish}
                  aria-label="Finish session"
                >
                  Finish
                </PillButton>
                {!canFinish && (
                  <>
                    <span className="logTabHint">Log a set to finish.</span>
                    <button type="button" className="textLink" onClick={cancelSession}>
                      Cancel
                    </button>
                  </>
                )}
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
        </>
      )}
    </div>
  );
}

export default LogTab;
