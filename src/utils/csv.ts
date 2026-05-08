import { TrainingPlan, WorkoutSession, ExerciseCategory, TrackingType } from "../types";
import { generateId } from "./id";

const CSV_HEADER =
  "type,date,name,desc_notes,exercise,muscle,category,tracking,weight,reps,duration,distance";
// Older exports only had the first 8 columns (no category/tracking/duration/distance).
const LEGACY_CSV_HEADER = "type,date,name,desc_notes,exercise,muscle,weight,reps";

export function exportToCSV(
  plans: TrainingPlan[],
  sessions: WorkoutSession[],
): string {
  const rows: string[] = [CSV_HEADER];

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
      ];
      rows.push(row.join(","));
    });
  });

  // Export Sessions
  sessions.forEach((session) => {
    session.exercises.forEach((ex) => {
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
          set.weight,
          set.reps,
          set.duration || "",
          set.distance || "",
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
  /** Rows left out because a column or a required field was missing. */
  skippedRows: number;
}

export function importFromCSV(csv: string): CSVImport {
  const records = parseCSV(csv);

  const header = records[0].join(",").trim();
  const isCurrent = header === CSV_HEADER;
  const isLegacy = header === LEGACY_CSV_HEADER;
  if (!isCurrent && !isLegacy) {
    throw new Error("The first line does not match a GymOS export, so nothing was read.");
  }

  const plansMap = new Map<string, TrainingPlan>();
  const sessionRows: string[][] = [];
  let skippedRows = 0;

  // First pass: Build Plans and collect session rows
  for (let i = 1; i < records.length; i++) {
    const parts = records[i];
    if (isBlank(parts)) continue;

    if (!isWellFormed(parts, isCurrent)) {
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
        plan.exercises.push({
          id: generateId(),
          name: exercise,
          muscleGroup: muscle,
          category,
          trackingType,
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
    const weight = isCurrent ? parts[8] : parts[6];
    const reps = isCurrent ? parts[9] : parts[7];
    const duration = isCurrent ? parts[10] : "";
    const distance = isCurrent ? parts[11] : "";

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

    let exLog = session.exercises.find((e) => e.name === exercise);
    if (!exLog) {
      const planEx = plan?.exercises.find((e) => e.name === exercise);
      exLog = {
        id: planEx?.id || generateId(),
        name: exercise,
        muscleGroup: muscle,
        category: planEx?.category || category,
        trackingType: planEx?.trackingType || trackingType,
        sets: [],
      };
      session.exercises.push(exLog);
    }

    if (weight && reps) {
      exLog.sets.push({
        id: generateId(),
        weight,
        reps,
        duration: duration || undefined,
        distance: distance || undefined,
      });
    } else if (duration || distance) {
      exLog.sets.push({
        id: generateId(),
        weight: "",
        reps: "",
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

// A row needs every column, a known type, a plan name and an exercise name; a session row also needs its date.
// Category and tracking are checked because timers and presets look them up and would fail on an unknown value.
function isWellFormed(parts: string[], isCurrent: boolean): boolean {
  if (parts.length < (isCurrent ? 12 : 8)) return false;
  const [type, date, name, , exercise, , category, tracking] = parts;
  if (type !== "plan" && type !== "session") return false;
  if (!name || !exercise) return false;
  if (isCurrent && (!CATEGORIES.includes(category) || !TRACKING_TYPES.includes(tracking))) return false;
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
