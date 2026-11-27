import { useSyncExternalStore } from "react";
import { DEFAULT_REST_SEC } from "../constants/timerPresets";
import { ExerciseCategory } from "../types";
import { saveToStorage } from "./storage";

/** The timer choices made in Settings. */
export interface TimerPreferences {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  /** The rest started after a set, per exercise category. */
  restSec: Record<ExerciseCategory, number>;
  /** A hold ends at its target and a rest follows; cardio never does. */
  restAfterHolds: boolean;
}

const STORAGE_KEY = "gym:timerPrefs";

export const DEFAULT_TIMER_PREFS: TimerPreferences = {
  soundEnabled: true,
  vibrationEnabled: true,
  restSec: DEFAULT_REST_SEC,
  restAfterHolds: true,
};

const seconds = (stored: unknown, fallback: number) =>
  typeof stored === "number" && Number.isInteger(stored) && stored > 0 ? stored : fallback;

/** Reads the stored choices; anything missing or unreadable falls back to the default. */
export function loadTimerPrefs(): TimerPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return {
      soundEnabled: parsed?.soundEnabled ?? true,
      vibrationEnabled: parsed?.vibrationEnabled ?? true,
      restSec: {
        strength: seconds(parsed?.restSec?.strength, DEFAULT_REST_SEC.strength),
        calisthenics: seconds(parsed?.restSec?.calisthenics, DEFAULT_REST_SEC.calisthenics),
        cardio: seconds(parsed?.restSec?.cardio, DEFAULT_REST_SEC.cardio),
      },
      restAfterHolds: parsed?.restAfterHolds !== false,
    };
  } catch {
    return DEFAULT_TIMER_PREFS;
  }
}

/** Stores the choices and reports whether the browser kept them. */
export function saveTimerPrefs(prefs: TimerPreferences): boolean {
  if (!saveToStorage(STORAGE_KEY, prefs)) return false;
  current = prefs;
  listeners.forEach((notify) => notify());
  return true;
}

// Screens read through useTimerPrefs, so a choice saved in Settings shows everywhere at once.
let current: TimerPreferences | null = null;
const listeners = new Set<() => void>();

const subscribe = (notify: () => void) => {
  listeners.add(notify);
  return () => void listeners.delete(notify);
};
const snapshot = () => (current ??= loadTimerPrefs());

export function useTimerPrefs(): TimerPreferences {
  return useSyncExternalStore(subscribe, snapshot);
}
