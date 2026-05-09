import { useState, useEffect } from "react";
import { PlansTab } from "./components/plans";
import { LogTab } from "./components/log";
import { ProgressTab } from "./components/progress";
import { TabBar } from "./components/shared";
import { useActiveSession } from "./hooks/useActiveSession";
import { fromPlan } from "./utils/activeSession";
import { today } from "./utils/date";
import { TrainingPlan, WorkoutSession } from "./types";
import { getFromStorage, saveToStorage } from "./utils/storage";
import "./GymTracker.css";

const TABS = [
  { id: "plans", label: "Plans" },
  { id: "log", label: "Log" },
  { id: "progress", label: "Progress" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const isTabId = (v: unknown): v is TabId => TABS.some((t) => t.id === v);

export default function GymTracker() {
  const [tab, setTab] = useState<TabId>("plans");
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loaded, setLoaded] = useState(false);
  const activeSession = useActiveSession();
  const [selectedExName, setSelectedExName] = useState<string>("");
  const [showData, setShowData] = useState(false);
  // New plan is modal-like: the tab bar hides and Cancel is the exit.
  const [creatingPlan, setCreatingPlan] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await getFromStorage<TrainingPlan[]>("gym:plans");
      const s = await getFromStorage<WorkoutSession[]>("gym:sessions");
      const t = await getFromStorage<string>("gym:tab");
      const ex = await getFromStorage<string>("gym:selectedExName");
      setPlans(p || []);
      setSessions(s || []);
      if (isTabId(t)) setTab(t);
      if (ex) setSelectedExName(ex);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (loaded) {
      saveToStorage("gym:tab", tab);
    }
  }, [tab, loaded]);

  useEffect(() => {
    if (loaded) {
      saveToStorage("gym:selectedExName", selectedExName);
    }
  }, [selectedExName, loaded]);

  // Plans and sessions are written as they change, not after render, so a
  // save can tell whether the browser kept it. storePlans/storeSessions keep
  // the earlier behaviour: the screen updates even if the write is refused.
  const storePlans = (next: TrainingPlan[]) => {
    saveToStorage("gym:plans", next);
    setPlans(next);
  };

  const storeSessions = (next: WorkoutSession[]) => {
    saveToStorage("gym:sessions", next);
    setSessions(next);
  };

  // A save the user waits on: nothing changes unless the write is kept, so a
  // refused write leaves the screen open and storage as it was.
  const commitPlans = (next: TrainingPlan[]) => {
    if (!saveToStorage("gym:plans", next)) return false;
    setPlans(next);
    return true;
  };

  const commitSessions = (next: WorkoutSession[]) => {
    if (!saveToStorage("gym:sessions", next)) return false;
    setSessions(next);
    return true;
  };

  const handleStartPlan = (plan: TrainingPlan) => {
    activeSession.begin(fromPlan(plan, today()));
  };

  if (!loaded) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--color-bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-accent)",
          fontSize: "12px",
          fontFamily: "var(--font-body)",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
        }}
      >
        Loading...
      </div>
    );
  }

  const { session } = activeSession;
  // An active session takes over the screen: it shows the log and no tab bar.
  const visibleTab: TabId = session ? "log" : tab;
  // New plan hides the tab bar, so no tab change can happen while it is open.
  const showTabs = !session && !creatingPlan;

  const changeTab = (next: TabId) => {
    setShowData(false);
    setTab(next);
  };

  const openData = () => {
    setTab("progress");
    setShowData(true);
  };

  const endSession = () => {
    activeSession.end();
    setTab("log");
  };

  return (
    <div className="gymOS">
      <div className={`mainContent ${showTabs ? "withTabs" : ""}`}>
        {visibleTab === "plans" && (
          <PlansTab
            plans={plans}
            sessions={sessions}
            setPlans={storePlans}
            commitPlans={commitPlans}
            onStartPlan={handleStartPlan}
            onImport={openData}
            creating={creatingPlan}
            onCreatingChange={setCreatingPlan}
          />
        )}
        {visibleTab === "log" && (
          <LogTab
            plans={plans}
            sessions={sessions}
            setSessions={storeSessions}
            commitSessions={commitSessions}
            session={session}
            onBegin={activeSession.begin}
            onUpdate={activeSession.update}
            onUpdateExercise={activeSession.updateExercise}
            onEnd={endSession}
            onNewPlan={() => {
              setTab("plans");
              setCreatingPlan(true);
            }}
            onImport={openData}
          />
        )}
        {visibleTab === "progress" && (
          <ProgressTab
            plans={plans}
            sessions={sessions}
            setPlans={storePlans}
            setSessions={storeSessions}
            selectedExName={selectedExName}
            setSelectedExName={setSelectedExName}
            showData={showData}
            setShowData={setShowData}
            onGoToLog={() => changeTab("log")}
          />
        )}
      </div>

      {showTabs && (
        <div className="shellTabs">
          <TabBar tabs={TABS} active={tab} onChange={changeTab} />
        </div>
      )}
    </div>
  );
}
