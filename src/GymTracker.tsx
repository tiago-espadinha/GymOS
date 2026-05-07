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
      saveToStorage("gym:plans", plans);
    }
  }, [plans, loaded]);

  useEffect(() => {
    if (loaded) {
      saveToStorage("gym:sessions", sessions);
    }
  }, [sessions, loaded]);

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

  const handleLogPlan = (plan: TrainingPlan) => {
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

  const endSession = () => {
    activeSession.end();
    setTab("log");
  };

  return (
    <div className="gymOS">
      <div className="mainContent">
        {visibleTab === "plans" && (
          <PlansTab
            plans={plans}
            setPlans={setPlans}
            onLogPlan={handleLogPlan}
          />
        )}
        {visibleTab === "log" && (
          <LogTab
            plans={plans}
            sessions={sessions}
            setSessions={setSessions}
            session={session}
            onBegin={activeSession.begin}
            onUpdate={activeSession.update}
            onEnd={endSession}
          />
        )}
        {visibleTab === "progress" && (
          <ProgressTab
            plans={plans}
            sessions={sessions}
            setPlans={setPlans}
            setSessions={setSessions}
            selectedExName={selectedExName}
            setSelectedExName={setSelectedExName}
          />
        )}
      </div>

      {!session && (
        <div className="shellTabs">
          <TabBar tabs={[...TABS]} active={tab} onChange={setTab} />
        </div>
      )}
    </div>
  );
}
