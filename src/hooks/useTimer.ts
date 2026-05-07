import { useCallback, useEffect, useRef, useState } from "react";
import { loadTimerPrefs } from "../utils/timerPrefs";

interface PersistedTimerState {
  isRunning: boolean;
  startedAt: number | null; // Date.now() when the current run began
  accumulatedMs: number; // elapsed time banked from previous runs
  targetMs: number;
  savedAt: number;
}

export interface TimerControls {
  isRunning: boolean;
  isComplete: boolean;
  elapsedMs: number;
  targetMs: number;
  overtimeMs: number;
  progress: number; // 0..1, clamped (use isComplete/overtimeMs for the rest)
  formattedElapsed: string;
  formattedTarget: string;
  start: () => void;
  pause: () => void;
  reset: () => void;
  setTargetSec: (seconds: number) => void;
  adjustTargetSec: (deltaSeconds: number) => void;
}

const MAX_RESUME_AGE_MS = 3 * 60 * 60 * 1000; // ignore stale persisted timers after 3h

function loadPersisted(timerId: string): PersistedTimerState | null {
  try {
    const raw = localStorage.getItem(`gym:timer:${timerId}`);
    if (!raw) return null;
    const parsed: PersistedTimerState = JSON.parse(raw);
    if (Date.now() - parsed.savedAt > MAX_RESUME_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function savePersisted(timerId: string, state: PersistedTimerState) {
  try {
    localStorage.setItem(`gym:timer:${timerId}`, JSON.stringify(state));
  } catch {
    // Silently fail
  }
}

function clearPersisted(timerId: string) {
  try {
    localStorage.removeItem(`gym:timer:${timerId}`);
  } catch {
    // Silently fail
  }
}

export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function playBeep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Audio not available - ignore
  }
}

/**
 * A single countdown/count-up timer, identified by `timerId`, that persists
 * across reloads (so a plank hold or a rest countdown survives an accidental
 * tab switch). Counts *up* from zero towards `initialTargetSec`, and keeps
 * counting into "overtime" past that point rather than stopping, since many
 * holds/cardio efforts are "at least this long" rather than a hard cutoff.
 */
export function useTimer(timerId: string, initialTargetSec: number): TimerControls {
  const initial = loadPersisted(timerId);

  const [isRunning, setIsRunning] = useState(initial?.isRunning ?? false);
  const [startedAt, setStartedAt] = useState<number | null>(
    initial?.isRunning ? initial.startedAt : null,
  );
  const [accumulatedMs, setAccumulatedMs] = useState(initial?.accumulatedMs ?? 0);
  const [targetMs, setTargetMsState] = useState(
    initial ? initial.targetMs : Math.max(0, initialTargetSec) * 1000,
  );
  // Held in state (not read during render) so the displayed clock stays a pure function of state.
  const [now, setNow] = useState(() => Date.now());

  const hasFiredCompleteRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Persist on every meaningful change.
  useEffect(() => {
    savePersisted(timerId, {
      isRunning,
      startedAt,
      accumulatedMs,
      targetMs,
      savedAt: Date.now(),
    });
  }, [timerId, isRunning, startedAt, accumulatedMs, targetMs]);

  // Re-render every 250ms while running so the displayed clock/ring animate.
  useEffect(() => {
    if (!isRunning) return;
    intervalRef.current = setInterval(() => setNow(Date.now()), 250);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [isRunning]);

  const elapsedMs = isRunning && startedAt !== null
    ? accumulatedMs + Math.max(0, now - startedAt)
    : accumulatedMs;

  const overtimeMs = Math.max(0, elapsedMs - targetMs);
  const isComplete = targetMs > 0 && elapsedMs >= targetMs;
  const progress = targetMs > 0 ? Math.min(1, elapsedMs / targetMs) : 0;

  // Fire the completion cue exactly once per run.
  useEffect(() => {
    if (isComplete && !hasFiredCompleteRef.current) {
      hasFiredCompleteRef.current = true;
      const prefs = loadTimerPrefs();
      if (prefs.vibrationEnabled && "vibrate" in navigator) {
        navigator.vibrate([120, 60, 120]);
      }
      if (prefs.soundEnabled) playBeep();
    }
    if (!isComplete) hasFiredCompleteRef.current = false;
  }, [isComplete]);

  const start = useCallback(() => {
    const t = Date.now();
    setNow(t);
    setIsRunning(true);
    setStartedAt(t);
  }, []);

  const pause = useCallback(() => {
    setIsRunning((running) => {
      if (!running) return running;
      setStartedAt((prevStarted) => {
        setAccumulatedMs((prevAcc) => prevAcc + (Date.now() - (prevStarted ?? Date.now())));
        return null;
      });
      return false;
    });
  }, []);

  const reset = useCallback(() => {
    setIsRunning(false);
    setStartedAt(null);
    setAccumulatedMs(0);
    hasFiredCompleteRef.current = false;
    clearPersisted(timerId);
  }, [timerId]);

  const setTargetSec = useCallback((seconds: number) => {
    setTargetMsState(Math.max(0, seconds) * 1000);
  }, []);

  const adjustTargetSec = useCallback((deltaSeconds: number) => {
    setTargetMsState((prev) => Math.max(0, prev + deltaSeconds * 1000));
  }, []);

  return {
    isRunning,
    isComplete,
    elapsedMs,
    targetMs,
    overtimeMs,
    progress,
    formattedElapsed: formatClock(elapsedMs),
    formattedTarget: formatClock(targetMs),
    start,
    pause,
    reset,
    setTargetSec,
    adjustTargetSec,
  };
}
