import { useSyncExternalStore } from "react";
import { saveToStorage } from "./storage";

export type WeightUnit = "kg" | "lbs";
export type DistanceUnit = "km" | "mi";

/** The units the user picked in Settings. Stored values stay in kg and the exercise's own distance unit. */
export interface UnitPreferences {
  weight: WeightUnit;
  distance: DistanceUnit;
}

const STORAGE_KEY = "gym:unitPrefs";

export const DEFAULT_UNIT_PREFS: UnitPreferences = { weight: "kg", distance: "km" };

/** Reads the stored units; anything missing, unknown or unreadable falls back to kg and km. */
export function loadUnitPrefs(): UnitPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return {
      weight: parsed?.weight === "lbs" ? "lbs" : "kg",
      distance: parsed?.distance === "mi" ? "mi" : "km",
    };
  } catch {
    return { ...DEFAULT_UNIT_PREFS };
  }
}

/** Stores the units and reports whether the browser kept them. */
export function saveUnitPrefs(prefs: UnitPreferences): boolean {
  if (!saveToStorage(STORAGE_KEY, prefs)) return false;
  current = prefs;
  listeners.forEach((notify) => notify());
  return true;
}

// Screens read the units through useUnitPrefs, so a choice saved in Settings shows everywhere at once.
let current: UnitPreferences | null = null;
const listeners = new Set<() => void>();

const subscribe = (notify: () => void) => {
  listeners.add(notify);
  return () => void listeners.delete(notify);
};
const snapshot = () => (current ??= loadUnitPrefs());

export function useUnitPrefs(): UnitPreferences {
  return useSyncExternalStore(subscribe, snapshot);
}
