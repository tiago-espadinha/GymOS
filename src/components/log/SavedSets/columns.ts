import { ExerciseLog, Set } from "../../../types";
import { getExerciseMeta } from "../../../utils/metrics";
import { secondsTime, timeSeconds, typedTime } from "../../../utils/timeField";
import { decimal, whole } from "../../../utils/typedNumber";
import type { UnitPreferences } from "../../../utils/unitPrefs";
import { distanceText, storedDistance, storedWeight, weightLabel, weightText } from "../../../utils/units";
import type { FieldFormat } from "./SetField";

export interface Column {
  key: "weight" | "reps" | "duration" | "distance";
  heading: string;
  /** Follows "Set N" in the field's name. */
  name: string;
  format: FieldFormat;
}

const asTyped = (text: string) => text;

// The values a saved set of this exercise has, in the units chosen in Settings.
export function setColumns(exercise: ExerciseLog, units: UnitPreferences): Column[] {
  const meta = getExerciseMeta(exercise);
  if (meta.trackingType === "time") {
    const time: Column = {
      key: "duration",
      heading: "Time",
      name: "time",
      format: {
        inputMode: "numeric",
        placeholder: "00:00",
        show: secondsTime,
        type: typedTime,
        store: (text) => (text ? String(timeSeconds(text)) : ""),
        settle: (text) => secondsTime(String(timeSeconds(text))),
      },
    };
    const distance: Column = {
      key: "distance",
      heading: units.distance,
      name: `distance, ${units.distance}`,
      format: {
        inputMode: "decimal",
        placeholder: "0",
        show: (stored) => distanceText(stored, meta.distanceUnit, units.distance),
        type: decimal,
        store: (text) => storedDistance(text, units.distance, meta.distanceUnit),
      },
    };
    return meta.trackDistance ? [time, distance] : [time];
  }
  const unit = weightLabel(units.weight);
  const weight: Column = {
    key: "weight",
    heading: unit,
    name: `weight, ${unit}`,
    format: {
      inputMode: "decimal",
      placeholder: "0",
      show: (stored) => weightText(stored, units.weight),
      type: decimal,
      store: (text) => storedWeight(text, units.weight),
    },
  };
  const reps: Column = {
    key: "reps",
    heading: "reps",
    name: "reps",
    format: { inputMode: "numeric", placeholder: "0", show: asTyped, type: whole, store: asTyped },
  };
  return meta.trackWeight ? [weight, reps] : [reps];
}

/** A new set starting from the last one's values; a rest taken belongs to the set it followed. */
export function copySet(last: Set | undefined, id: string): Set {
  const set: Set = { id, weight: last?.weight ?? "", reps: last?.reps ?? "" };
  if (last?.duration) set.duration = last.duration;
  if (last?.distance) set.distance = last.distance;
  return set;
}
