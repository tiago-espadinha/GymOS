import { useState } from 'react'
import './App.css'
import { PlansTab } from './components/plans'
import { TrainingPlan } from './types'

function App() {
  const [plans, setPlans] = useState<TrainingPlan[]>([])
  const [lastLoggedPlan, setLastLoggedPlan] = useState<TrainingPlan | null>(null)

  const handleLogPlan = (plan: TrainingPlan) => {
    setLastLoggedPlan(plan)
    console.log('Logged training plan:', plan)
  }

  return (
    <main>
      <h1>Gym Tracker</h1>
      <PlansTab plans={plans} setPlans={setPlans} onLogPlan={handleLogPlan} />
      {lastLoggedPlan && (
        <section className="logInfo">
          <h2>Last logged plan</h2>
          <p>{lastLoggedPlan.name}</p>
        </section>
      )}
    </main>
  )
}

export default App
