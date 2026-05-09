export interface TimerPreferences {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

const STORAGE_KEY = "gym:timerPrefs";

const DEFAULT_PREFS: TimerPreferences = {
  soundEnabled: true,
  vibrationEnabled: true,
};

export function loadTimerPrefs(): TimerPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw);
    return {
      soundEnabled: parsed.soundEnabled ?? true,
      vibrationEnabled: parsed.vibrationEnabled ?? true,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}
