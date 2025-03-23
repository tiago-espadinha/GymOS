import { useState, useEffect } from 'react';
import Colors from './constants/colors';
import { PlansTab } from './components/plans';
import { LogTab } from './components/log';
import { ProgressTab } from './components/progress';
import { TrainingPlan, WorkoutSession } from './types';
import { getFromStorage, saveToStorage } from './utils/storage';

interface TabConfig {
  id: string;
  label: string;
}

const TABS: TabConfig[] = [
  { id: 'plans', label: 'Plans' },
  { id: 'log', label: 'Log Session' },
  { id: 'progress', label: 'Progress' },
];

export default function GymTracker() {
  const [tab, setTab] = useState<string>('plans');
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [logPlan, setLogPlan] = useState<TrainingPlan | null>(null);

  useEffect(() => {
    (async () => {
      const p = await getFromStorage('gym:plans');
      const s = await getFromStorage('gym:sessions');
      const t = await getFromStorage('gym:tab');
      setPlans(p || []);
      setSessions(s || []);
      if (t) setTab(t);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (loaded) {
      saveToStorage('gym:plans', plans);
    }
  }, [plans, loaded]);

  useEffect(() => {
    if (loaded) {
      saveToStorage('gym:sessions', sessions);
    }
  }, [sessions, loaded]);

  useEffect(() => {
    if (loaded) {
      saveToStorage('gym:tab', tab);
    }
  }, [tab, loaded]);

  const handleLogPlan = (plan: TrainingPlan) => {
    setLogPlan(plan);
    setTab('log');
  };

  if (!loaded) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: Colors.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: Colors.accent,
          fontSize: '12px',
          fontFamily: 'monospace',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: Colors.bg,
        color: Colors.text,
        fontFamily: "'SF Mono','JetBrains Mono','Fira Code','Consolas',monospace",
      }}
    >
      {/* Navigation */}
      <div
        style={{
          background: Colors.card,
          borderBottom: `1px solid ${Colors.border}`,
          padding: '0 32px',
          display: 'flex',
          alignItems: 'stretch',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            fontSize: '13px',
            fontWeight: '800',
            color: Colors.accent,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            paddingRight: '28px',
            marginRight: '8px',
            borderRight: `1px solid ${Colors.border}`,
          }}
        >
          ◈ GymOS
        </div>

        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '18px 20px',
              fontSize: '11px',
              fontWeight: '700',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: tab === t.id ? Colors.accent : Colors.muted,
              fontFamily: 'inherit',
              borderBottom: `2px solid ${tab === t.id ? Colors.accent : 'transparent'}`,
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}

        <div style={{ flex: 1 }} />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            fontSize: '11px',
            color: Colors.dim,
          }}
        >
          <span>{plans.length} plans</span>
          <span>{sessions.length} sessions</span>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '880px', margin: '0 auto', padding: '40px 28px' }}>
        {tab === 'plans' && (
          <PlansTab plans={plans} setPlans={setPlans} onLogPlan={handleLogPlan} />
        )}
        {tab === 'log' && (
          <LogTab
            plans={plans}
            sessions={sessions}
            setSessions={setSessions}
            initialPlan={logPlan || undefined}
          />
        )}
        {tab === 'progress' && <ProgressTab plans={plans} sessions={sessions} />}
      </div>
    </div>
  );
}
