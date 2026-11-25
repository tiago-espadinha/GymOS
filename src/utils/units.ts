import type { Set } from "../types";
import type { DistanceUnit, UnitPreferences, WeightUnit } from "./unitPrefs";

// Exact by definition (international yard and pound agreement).
export const KG_PER_LB = 0.45359237;
export const KM_PER_MI = 1.609344;

/** The label shown after a weight: "kg" or "lb" (Settings stores the choice as "lbs"). */
export const weightLabel = (unit: WeightUnit): string => (unit === "lbs" ? "lb" : "kg");

/** The step of a weight stepper in the shown unit. */
export const weightStep = (unit: WeightUnit): number => (unit === "lbs" ? 5 : 2.5);

export const kgTo = (kg: number, unit: WeightUnit): number => (unit === "lbs" ? kg / KG_PER_LB : kg);
export const toKg = (value: number, unit: WeightUnit): number => (unit === "lbs" ? value * KG_PER_LB : value);

export function convertDistance(value: number, from: DistanceUnit, to: DistanceUnit): number {
  if (from === to) return value;
  return from === "km" ? value / KM_PER_MI : value * KM_PER_MI;
}

/** A number with at most `decimals` places and no trailing zeros: 220.5, 135, 3.11. */
export function trimNumber(value: number, decimals: number): string {
  return String(Number(value.toFixed(decimals)) || 0);
}

const parse = (text: string | undefined): number => {
  const n = parseFloat(text ?? "");
  return Number.isFinite(n) ? n : NaN;
};

/** A stored kg value as shown in `unit`, rounded to 0.1. Blank or unreadable text is passed through. */
export function weightText(storedKg: string, unit: WeightUnit): string {
  const n = parse(storedKg);
  return Number.isNaN(n) ? storedKg : trimNumber(kgTo(n, unit), 1);
}

/** A weight typed in `unit` as stored kg, at full precision (never the rounded display value). */
export function storedWeight(text: string, unit: WeightUnit): string {
  if (unit === "kg") return text;
  const n = parse(text);
  return Number.isNaN(n) ? text : String(toKg(n, unit));
}

/** A distance stored in `from` as shown in `to`, rounded to 0.01. */
export function distanceText(stored: string, from: DistanceUnit, to: DistanceUnit): string {
  const n = parse(stored);
  return Number.isNaN(n) ? stored : trimNumber(convertDistance(n, from, to), 2);
}

/** A distance typed in `shown` as stored in the exercise's own unit, at full precision. */
export function storedDistance(text: string, shown: DistanceUnit, stored: DistanceUnit): string {
  if (shown === stored) return text;
  const n = parse(text);
  return Number.isNaN(n) ? text : String(convertDistance(n, shown, stored));
}

/** A stored set with its weight and distance as text in the chosen units, for editing. */
export function setToDisplay(set: Set, prefs: UnitPreferences, storedUnit: DistanceUnit): Set {
  const shown: Set = { ...set, weight: weightText(set.weight, prefs.weight) };
  if (set.distance !== undefined) shown.distance = distanceText(set.distance, storedUnit, prefs.distance);
  return shown;
}

/**
 * The edited set back in storage units. A field whose text is still what `setToDisplay` showed keeps
 * its stored value, so opening and saving a set never rounds it.
 */
export function setFromDisplay(edited: Set, original: Set, prefs: UnitPreferences, storedUnit: DistanceUnit): Set {
  const shown = setToDisplay(original, prefs, storedUnit);
  const result: Set = {
    ...edited,
    weight: edited.weight === shown.weight ? original.weight : storedWeight(edited.weight, prefs.weight),
  };
  if (edited.distance !== undefined) {
    result.distance =
      edited.distance === shown.distance ? original.distance : storedDistance(edited.distance, prefs.distance, storedUnit);
  }
  return result;
}

/**
 * Sets with weight and distance converted to the chosen units at full precision, for figures
 * that are computed and then rounded (volume, averages, chart values).
 */
export function setsInUnits(sets: Set[], weight: WeightUnit, distance: DistanceUnit, storedUnit: DistanceUnit): Set[] {
  if (weight === "kg" && distance === storedUnit) return sets;
  return sets.map((s) => {
    const w = parse(s.weight);
    const d = parse(s.distance);
    return {
      ...s,
      weight: Number.isNaN(w) ? s.weight : String(kgTo(w, weight)),
      distance: Number.isNaN(d) ? s.distance : String(convertDistance(d, storedUnit, distance)),
    };
  });
}
