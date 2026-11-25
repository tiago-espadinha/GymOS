import { TrainingPlan, WorkoutSession, ExerciseCategory, TrackingType } from "../types";
import { generateId } from "./id";
import { DEFAULT_UNIT_PREFS, type DistanceUnit, type UnitPreferences, type WeightUnit } from "./unitPrefs";
import { convertDistance, kgTo, storedDistance, storedWeight, trimNumber, weightLabel } from "./units";

// weight_unit and distance_unit name the units of the numbers on a session row; on a plan row,
// distance_unit is the unit the exercise stores its distances in.
const CSV_HEADER =
  "type,date,name,desc_notes,exercise,muscle,category,tracking,weight,reps,duration,distance,weight_unit,distance_unit";
// Exports before units had 12 columns, in kg and each exercise's own distance unit.
const UNITLESS_CSV_HEADER =
  "type,date,name,desc_notes,exercise,muscle,category,tracking,weight,reps,duration,distance";
// Older exports only had the first 8 columns (no category/tracking/duration/distance).
const LEGACY_CSV_HEADER = "type,date,name,desc_notes,exercise,muscle,weight,reps";

// A stored value in the export's unit: untouched when no conversion is needed, else rounded to 0.01.
function exportNumber(stored: string | undefined, convert: ((n: number) => number) | null): string {
  if (!stored || !convert) return stored ?? "";
  const n = parseFloat(stored);
  return Number.isFinite(n) ? trimNumber(convert(n), 2) : stored;
}

/** Plans and sessions as CSV, with session weights and distances in the chosen units. */
export function exportToCSV(
  plans: TrainingPlan[],
  sessions: WorkoutSession[],
  units: UnitPreferences = DEFAULT_UNIT_PREFS,
): string {
  const rows: string[] = [CSV_HEADER];
  const toWeight = units.weight === "kg" ? null : (kg: number) => kgTo(kg, units.weight);

  // Export Plans
  plans.forEach((plan) => {
    plan.exercises.forEach((ex) => {
      const row = [
        "plan",
        "",
        escapeCSV(plan.name),
        escapeCSV(plan.desc),
        escapeCSV(ex.name),
        escapeCSV(ex.muscleGroup),
        ex.category || "strength",
        ex.trackingType || "reps",
        "",
        "",
        "",
        "",
        "",
        ex.distanceUnit ?? "",
      ];
      rows.push(row.join(","));
    });
  });

  // Export Sessions
  sessions.forEach((session) => {
    session.exercises.forEach((ex) => {
      const from = ex.distanceUnit || "km";
      const toDistance = from === units.distance ? null : (d: number) => convertDistance(d, from, units.distance);
      ex.sets.forEach((set) => {
        const row = [
          "session",
          session.date,
          escapeCSV(session.planName),
          escapeCSV(session.notes),
          escapeCSV(ex.name),
          escapeCSV(ex.muscleGroup),
          ex.category || "strength",
          ex.trackingType || "reps",
          exportNumber(set.weight, toWeight),
          set.reps,
          set.duration || "",
          exportNumber(set.distance, toDistance),
          weightLabel(units.weight),
          units.distance,
        ];
        rows.push(row.join(","));
      });
    });
  });

  return rows.join("\n");
}

function escapeCSV(val: string): string {
  if (!val) return "";
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export interface CSVImport {
  plans: TrainingPlan[];
  sessions: WorkoutSession[];
  /** Rows left out because a column, a required field or a unit was missing or unknown. */
  skippedRows: number;
}

export function importFromCSV(csv: string): CSVImport {
  const records = parseCSV(csv);

  const layout = lookup(LAYOUTS, records[0].join(",").trim());
  if (!layout) {
    throw new Error("The first line does not match a GymOS export, so nothing was read.");
  }
  const isCurrent = layout !== "legacy";

  const plansMap = new Map<string, TrainingPlan>();
  const sessionRows: string[][] = [];
  let skippedRows = 0;

  // First pass: Build Plans and collect session rows
  for (let i = 1; i < records.length; i++) {
    const parts = records[i];
    if (isBlank(parts)) continue;

    if (!isWellFormed(parts, layout)) {
      skippedRows++;
      continue;
    }

    const type = parts[0];
    const name = parts[2];
    const desc_notes = parts[3];
    const exercise = parts[4];
    const muscle = parts[5];
    const category = (isCurrent ? parts[6] : "strength") as ExerciseCategory;
    const trackingType = (isCurrent ? parts[7] : "reps") as TrackingType;

    if (type === "plan") {
      if (!plansMap.has(name)) {
        plansMap.set(name, {
          id: generateId(),
          name,
          desc: desc_notes,
          exercises: [],
        });
      }
      const plan = plansMap.get(name)!;
      if (!plan.exercises.find((e) => e.name === exercise)) {
        const distanceUnit = layout === "units" ? lookup(DISTANCE_UNITS, parts[13]) : undefined;
        plan.exercises.push({
          id: generateId(),
          name: exercise,
          muscleGroup: muscle,
          category,
          trackingType,
          ...(distanceUnit && { distanceUnit }),
        });
      }
    } else {
      sessionRows.push(parts);
    }
  }

  const sessionsMap = new Map<string, WorkoutSession>();

  // Second pass: Process sessions using plan info
  for (const parts of sessionRows) {
    const date = parts[1];
    const name = parts[2];
    const desc_notes = parts[3];
    const exercise = parts[4];
    const muscle = parts[5];
    const category = (isCurrent ? parts[6] : "strength") as ExerciseCategory;
    const trackingType = (isCurrent ? parts[7] : "reps") as TrackingType;
    const reps = isCurrent ? parts[9] : parts[7];
    const duration = isCurrent ? parts[10] : "";
    const units = rowUnits(parts, layout)!;

    const sessionKey = `${date}_${name}_${desc_notes}`;

    const plan = plansMap.get(name);

    if (!sessionsMap.has(sessionKey)) {
      sessionsMap.set(sessionKey, {
        id: generateId(),
        planId: plan?.id || "",
        planName: name,
        date,
        notes: desc_notes,
        exercises: [],
      });
    }
    const session = sessionsMap.get(sessionKey)!;

    const planEx = plan?.exercises.find((e) => e.name === exercise);
    // Stored like a logged set: weight in kg, distance in the exercise's own unit.
    const storedUnit = planEx?.distanceUnit || "km";
    const weight = storedWeight(isCurrent ? parts[8] : parts[6], units.weight);
    const distance = storedDistance(isCurrent ? parts[11] : "", units.distance ?? storedUnit, storedUnit);

    let exLog = session.exercises.find((e) => e.name === exercise);
    if (!exLog) {
      exLog = {
        id: planEx?.id || generateId(),
        name: exercise,
        muscleGroup: muscle,
        category: planEx?.category || category,
        trackingType: planEx?.trackingType || trackingType,
        ...(planEx?.distanceUnit && { distanceUnit: planEx.distanceUnit }),
        sets: [],
      };
      session.exercises.push(exLog);
    }

    // Any logged value makes a set: reps alone (bodyweight) and a weighted hold both round-trip.
    if (weight || reps || duration || distance) {
      exLog.sets.push({
        id: generateId(),
        weight,
        reps,
        duration: duration || undefined,
        distance: distance || undefined,
      });
    }
  }

  return {
    plans: Array.from(plansMap.values()),
    sessions: Array.from(sessionsMap.values()),
    skippedRows,
  };
}

const CATEGORIES: readonly string[] = ["strength", "calisthenics", "cardio"] satisfies ExerciseCategory[];
const TRACKING_TYPES: readonly string[] = ["reps", "time"] satisfies TrackingType[];

type Layout = "units" | "unitless" | "legacy";
const LAYOUTS: Record<string, Layout> = {
  [CSV_HEADER]: "units",
  [UNITLESS_CSV_HEADER]: "unitless",
  [LEGACY_CSV_HEADER]: "legacy",
};
const COLUMNS: Record<Layout, number> = { units: 14, unitless: 12, legacy: 8 };

const WEIGHT_UNITS: Record<string, WeightUnit> = { kg: "kg", lb: "lbs", lbs: "lbs" };
const DISTANCE_UNITS: Record<string, DistanceUnit> = { km: "km", mi: "mi" };

// Own keys only: file text such as "__proto__" must not match an inherited member.
const lookup = <T>(table: Record<string, T>, key: string): T | undefined => (Object.hasOwn(table, key) ? table[key] : undefined);

// The units of a row's numbers; files without unit columns are in kg and the exercise's own
// distance unit. Null when a number's unit is missing or unknown, as guessing would change the value.
function rowUnits(parts: string[], layout: Layout): { weight: WeightUnit; distance?: DistanceUnit } | null {
  if (layout !== "units") return { weight: "kg" };
  const weight = lookup(WEIGHT_UNITS, parts[12]);
  const distance = lookup(DISTANCE_UNITS, parts[13]);
  if ((parts[12] || parts[8]) && !weight) return null;
  if ((parts[13] || parts[11]) && !distance) return null;
  return { weight: weight ?? "kg", distance };
}

// A row needs every column, a known type, a plan name and an exercise name; a session row also needs its date.
// Category and tracking are checked because timers and presets look them up and would fail on an unknown value.
function isWellFormed(parts: string[], layout: Layout): boolean {
  if (parts.length < COLUMNS[layout]) return false;
  const [type, date, name, , exercise, , category, tracking] = parts;
  if (type !== "plan" && type !== "session") return false;
  if (!name || !exercise) return false;
  if (layout !== "legacy" && (!CATEGORIES.includes(category) || !TRACKING_TYPES.includes(tracking))) return false;
  if (!rowUnits(parts, layout)) return false;
  return type === "plan" || Boolean(date);
}

// Splits the file into records. A line break inside a quoted field belongs to the field,
// so notes written with several lines survive the round trip. CRLF and LF both end a record.
function parseCSV(text: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let inQuotes = false;

  // Whitespace around a row is dropped, as a hand-edited file may indent or pad it.
  const endRecord = () => {
    record.push(field);
    record[0] = record[0].trimStart();
    record[record.length - 1] = record[record.length - 1].trimEnd();
    records.push(record);
    record = [];
    field = "";
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    // A quote opens a quoted value only at the start of a field; elsewhere it is a literal character.
    if (char === '"' && (inQuotes || field === "")) {
      if (inQuotes && text[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (inQuotes) {
      field += char;
    } else if (char === ",") {
      record.push(field);
      field = "";
    } else if (char === "\n") {
      endRecord();
    } else if (char !== "\r") {
      field += char;
    }
  }
  // An open quote at the end means the rest of the file would collapse into one field.
  if (inQuotes) {
    throw new Error("A quoted value is never closed, so nothing was read.");
  }
  endRecord();
  return records;
}

function isBlank(record: string[]): boolean {
  return record.length === 1 && record[0].trim() === "";
}
