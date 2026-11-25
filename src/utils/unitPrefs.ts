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
  return saveToStorage(STORAGE_KEY, prefs);
}
