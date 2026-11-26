import { useEffect, useRef, useState } from "react";
import { Icon, PillButton } from "../../shared";
import { today, formatDateMeta } from "../../../utils/date";
import { ExerciseLog, TrainingPlan, WorkoutSession } from "../../../types";
import {
  ActiveSession,
  fromPlan,
  fromSaved,
  hasLoggedSets,
  toWorkoutSession,
} from "../../../utils/activeSession";
import { generateId } from "../../../utils/id";
import { exportToCSV } from "../../../utils/csv";
import { downloadCSV } from "../../../utils/download";
import { clearSessionRests } from "../../../utils/restTimers";
import { exerciseFinishId, sessionTotals } from "../../../utils/sessionList";
import { allExercisesDone } from "../../../utils/setModel";
import FinishScreen from "../FinishScreen";
import LogHome from "../LogHome";
import SessionList from "../SessionList";
import SessionSheet from "../SessionSheet";
import "./LogTab.css";
import { useUnitPrefs } from "../../../utils/unitPrefs";

const FINISH_ID = "logTabFinish";

interface LogTabProps {
  plans: TrainingPlan[];
  sessions: WorkoutSession[];
  setSessions: (sessions: WorkoutSession[]) => void;
  /** Stores sessions and reports whether the browser kept them. */
  commitSessions: (sessions: WorkoutSession[]) => boolean;
  session: ActiveSession | null;
  onBegin: (session: ActiveSession) => void;
  onUpdate: (patch: Partial<ActiveSession>) => void;
  onUpdateExercise: (exercise: ExerciseLog) => void;
  onEnd: () => void;
  onNewPlan: () => void;
  /** Opens Settings to import a CSV; passed only while the device holds no data. */
  onImport?: () => void;
}

export function LogTab({
  plans,
  sessions,
  setSessions,
  commitSessions,
  session,
  onBegin,
  onUpdate,
  onUpdateExercise,
  onEnd,
  onNewPlan,
  onImport,
}: LogTabProps) {
  const units = useUnitPrefs();
  const [homeDate, setHomeDate] = useState(today());
  // The session saved or updated since Log home was last shown; its row is marked in Recent.
  const [justSaved, setJustSaved] = useState<{ id: string; planName: string; updated: boolean } | null>(null);
  const [deleted, setDeleted] = useState("");
  const [finishing, setFinishing] = useState(false);
  // The exercise open in the session, kept here so the Done screen's Back returns to it.
  const [openId, setOpenId] = useState<string | null>(null);
  // Refused Saves in a row on the Done screen; 0 once a save lands or Done closes.
  const [saveFailures, setSaveFailures] = useState(0);
  const [actionsOpen, setActionsOpen] = useState(false);

  const titleRef = useRef<HTMLHeadingElement>(null);
  const inSession = Boolean(session);

  // Starting or ending a session removes the button that was focused, so move
  // focus to the title instead of letting it fall back to the top of the page.
  // ‹ Session returns to the Finish that opened the Done screen.
  const mounted = useRef(false);
  // The id of the Finish that opened the Done screen, while going back to it.
  const backFromFinish = useRef<string | null>(null);
  useEffect(() => {
    if (backFromFinish.current) document.getElementById(backFromFinish.current)?.focus();
    else if (mounted.current || inSession) titleRef.current?.focus();
    backFromFinish.current = null;
    mounted.current = true;
  }, [inSession, finishing]);

  const editingId = session?.editingId;

  const startPlan = (plan: TrainingPlan) => {
    setOpenId(null);
    setJustSaved(null);
    setDeleted("");
    onBegin(fromPlan(plan, homeDate));
  };

  const startEdit = (previous: WorkoutSession) => {
    setOpenId(null);
    setJustSaved(null);
    setDeleted("");
    onBegin(fromSaved(previous));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const discardSession = () => {
    setActionsOpen(false);
    if (session) clearSessionRests(session.exercises);
    setSaveFailures(0);
    setFinishing(false);
    onEnd();
  };

  const saveSession = () => {
    if (!session) return;

    const id = editingId ?? generateId();
    const stored = toWorkoutSession(session, id);
    if (!stored) return;

    const next = editingId
      ? sessions.map((s) => (s.id === editingId ? { ...s, ...stored } : s))
      : [stored, ...sessions];
    // A refused write keeps the Done screen open with the notes, so nothing is lost.
    if (!commitSessions(next)) {
      setSaveFailures((n) => n + 1);
      return;
    }
    setSaveFailures(0);
    setJustSaved({ id, planName: session.planName, updated: Boolean(editingId) });
    clearSessionRests(session.exercises);
    setFinishing(false);
    onEnd();
  };

  const downloadSession = () => {
    const unsaved = session && toWorkoutSession(session, editingId ?? "");
    if (unsaved) downloadCSV(exportToCSV([], [unsaved], units), `gymos_session_${unsaved.date}.csv`);
  };

  // Only a saved session being edited can be deleted; the confirm sheet has asked already.
  const deleteSession = () => {
    if (!session || !editingId) return;
    setSessions(sessions.filter((s) => s.id !== editingId));
    clearSessionRests(session.exercises);
    setJustSaved(null);
    setDeleted(`${session.planName} session deleted`);
    setActionsOpen(false);
    setSaveFailures(0);
    setFinishing(false);
    onEnd();
  };

  const canFinish = session ? hasLoggedSets(session) : false;
  const allDone = session ? allExercisesDone(session.exercises) : false;
  const loggedSets = session ? sessionTotals(session.exercises).sets : 0;

  // The status region stays mounted while the Done screen shows, so a save
  // message that appears on Save is announced.
  return (
    <div>
      {!session && (
        <h1 className="logTabTitle visuallyHidden" ref={titleRef} tabIndex={-1}>
          Log
        </h1>
      )}

      <div role="status" className="visuallyHidden">
        {justSaved ? `${justSaved.planName} session ${justSaved.updated ? "updated" : "saved"}` : deleted}
      </div>

      {session && actionsOpen && (
        <SessionSheet
          session={session}
          onDate={(date) => onUpdate({ date })}
          onDiscard={discardSession}
          onDelete={deleteSession}
          onClose={() => setActionsOpen(false)}
        />
      )}

      {session && finishing ? (
        <FinishScreen
          session={session}
          onNotes={(notes) => onUpdate({ notes })}
          onDate={(date) => onUpdate({ date })}
          onSave={saveSession}
          saveFailures={saveFailures}
          onDownload={downloadSession}
          onBack={() => {
            // The last exercise's Finish card, else the list's.
            backFromFinish.current = openId ? exerciseFinishId(openId) : FINISH_ID;
            setSaveFailures(0);
            setFinishing(false);
          }}
        />
      ) : (
        <>
          {session ? (
            <SessionList
              planName={session.planName}
              exercises={session.exercises}
              onChangeExercise={onUpdateExercise}
              sessions={sessions}
              editingId={editingId}
              finish={{ disabled: !canFinish, allDone, onClick: () => setFinishing(true) }}
              openId={openId}
              onOpen={setOpenId}
              header={
                <header className="logTabHeader">
                  <div className="logTabHeading">
                    <span className={editingId ? "logTabKicker" : "logTabMeta"}>
                      {editingId && "Editing · "}
                      {formatDateMeta(session.date)} · {loggedSets} {loggedSets === 1 ? "set" : "sets"}
                    </span>
                    <h1 className="logTabSessionTitle" ref={titleRef} tabIndex={-1}>
                      {session.planName}
                    </h1>
                  </div>
                  <div className="logTabHeaderActions">
                    <button
                      type="button"
                      className="logTabMore"
                      aria-label="Session actions"
                      aria-haspopup="dialog"
                      onClick={() => setActionsOpen(true)}
                    >
                      <Icon name="more" size="md" />
                    </button>
                    <PillButton
                      id={FINISH_ID}
                      variant={allDone ? "white" : "outline-white"}
                      onClick={() => setFinishing(true)}
                      disabled={!canFinish}
                      aria-label="Finish session"
                    >
                      Finish
                    </PillButton>
                  </div>
                </header>
              }
              actions={
                <>
                  {!canFinish && <p className="logTabHint">Log a set to finish.</p>}
                  {/* The status stays mounted so "all done" is announced when it appears. */}
                  <p role="status" className="logTabDoneStatus">
                    {allDone && (
                      <>
                        <Icon name="check" />
                        All {session.exercises.length} exercises done
                      </>
                    )}
                  </p>
                </>
              }
            />
          ) : (
            <LogHome
              plans={plans}
              sessions={sessions}
              date={homeDate}
              onDateChange={setHomeDate}
              onStart={startPlan}
              onEdit={startEdit}
              justSaved={justSaved && { id: justSaved.id, label: justSaved.updated ? "Just updated" : "Just saved" }}
              onNewPlan={onNewPlan}
              onImport={onImport}
            />
          )}
        </>
      )}
    </div>
  );
}

export default LogTab;
