import { useState } from "react";
import "./App.css";
import { PlansTab } from "./components/plans";
import { LogTab } from "./components/log";
import { TrainingPlan, WorkoutSession } from "./types";

function App() {
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [lastLoggedPlan, setLastLoggedPlan] = useState<TrainingPlan | null>(
    null,
  );

  const handleLogPlan = (plan: TrainingPlan) => {
    setLastLoggedPlan(plan);
    console.log("Logged training plan:", plan);
  };

  return (
    <main>
      <h1>Gym Tracker</h1>
      <PlansTab plans={plans} setPlans={setPlans} onLogPlan={handleLogPlan} />
      <LogTab
        plans={plans}
        sessions={sessions}
        setSessions={setSessions}
      ></LogTab>
      {lastLoggedPlan && (
        <section className="logInfo">
          <h2>Last logged plan</h2>
          <p>{lastLoggedPlan.name}</p>
        </section>
      )}
    </main>
  );
}

export default App;
