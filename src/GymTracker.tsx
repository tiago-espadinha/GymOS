import { useState, useEffect } from "react";
import { PlansTab } from "./components/plans";
import { LogTab } from "./components/log";
import { ProgressTab } from "./components/progress";
import { TrainingPlan, WorkoutSession } from "./types";
import { getFromStorage, saveToStorage } from "./utils/storage";
import Colors from "./constants/colors";
import "./GymTracker.css";

interface TabConfig {
  id: string;
  label: string;
  icon?: string;
}

const TABS: TabConfig[] = [
  { id: "plans", label: "Plans", icon: "📋​" },
  { id: "log", label: "Log", icon: "✏️​" },
  { id: "progress", label: "Progress", icon: "📈" },
];

export default function GymTracker() {
  const [tab, setTab] = useState<string>("plans");
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [logPlan, setLogPlan] = useState<TrainingPlan | null>(null);

  useEffect(() => {
    (async () => {
      const p = await getFromStorage("gym:plans");
      const s = await getFromStorage("gym:sessions");
      const t = await getFromStorage("gym:tab");
      setPlans(p || []);
      setSessions(s || []);
      if (t) setTab(t);
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

  const handleLogPlan = (plan: TrainingPlan) => {
    setLogPlan(plan);
    setTab("log");
  };

  if (!loaded) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: Colors.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: Colors.accent,
          fontSize: "12px",
          fontFamily: "monospace",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <div className="gymOS">
      {/* Navigation */}
      <div className="navBar">
        <div className="logoArea">◈ GymOS</div>

        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`tabButton ${tab === t.id ? "active" : ""}`}
          >
            <span className="tabIcon" style={{ display: "none" }}>
              {t.icon}
            </span>
            <span className="tabLabel">{t.label}</span>
          </button>
        ))}

        <div className="navSpacer" />
        <div className="navStats">
          <span>{plans.length} plans</span>
          <span>{sessions.length} sessions</span>
        </div>
      </div>

      {/* Content */}
      <div className="mainContent">
        {tab === "plans" && (
          <PlansTab
            plans={plans}
            setPlans={setPlans}
            onLogPlan={handleLogPlan}
          />
        )}
        {tab === "log" && (
          <LogTab
            plans={plans}
            sessions={sessions}
            setSessions={setSessions}
            initialPlan={logPlan || undefined}
          />
        )}
        {tab === "progress" && (
          <ProgressTab
            plans={plans}
            sessions={sessions}
            setPlans={setPlans}
            setSessions={setSessions}
          />
        )}
      </div>
    </div>
  );
}
