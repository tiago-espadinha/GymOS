import { ExerciseCategory } from "../types";
import { TimerPhase } from "../constants/timerPresets";

export interface TimerPreferences {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  // key is `${category}-${phase}`, e.g. "cardio-work"
  customPresets: Record<string, number[]>;
}

const STORAGE_KEY = "gym:timerPrefs";

const DEFAULT_PREFS: TimerPreferences = {
  soundEnabled: true,
  vibrationEnabled: true,
  customPresets: {},
};

export function presetKey(category: ExerciseCategory, phase: TimerPhase): string {
  return `${category}-${phase}`;
}

export function loadTimerPrefs(): TimerPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS, customPresets: {} };
    const parsed = JSON.parse(raw);
    return {
      soundEnabled: parsed.soundEnabled ?? true,
      vibrationEnabled: parsed.vibrationEnabled ?? true,
      customPresets: parsed.customPresets ?? {},
    };
  } catch {
    return { ...DEFAULT_PREFS, customPresets: {} };
  }
}

export function saveTimerPrefs(prefs: TimerPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Silently fail - custom presets/sound toggles are a nice-to-have.
  }
}

export function addCustomPreset(
  category: ExerciseCategory,
  phase: TimerPhase,
  seconds: number,
): TimerPreferences {
  const prefs = loadTimerPrefs();
  const key = presetKey(category, phase);
  const existing = prefs.customPresets[key] || [];
  if (!existing.includes(seconds)) {
    prefs.customPresets = {
      ...prefs.customPresets,
      [key]: [...existing, seconds].sort((a, b) => a - b),
    };
    saveTimerPrefs(prefs);
  }
  return prefs;
}
