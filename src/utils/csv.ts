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
  const lines = csv.split("\n");

  const header = lines[0].trim();
  const isCurrent = header === CSV_HEADER;
  const isLegacy = header === LEGACY_CSV_HEADER;
  if (!isCurrent && !isLegacy) {
    throw new Error("The first line does not match a GymOS export, so nothing was read.");
  }

  const plansMap = new Map<string, TrainingPlan>();
  const sessionRows: string[][] = [];
  let skippedRows = 0;

  // First pass: Build Plans and collect session rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = parseCSVLine(line);
    const minCols = isCurrent ? 12 : 8;
    if (!isWellFormed(parts, minCols)) {
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

// A row needs every column, a known type, a plan name and an exercise name; a session row also needs its date.
function isWellFormed(parts: string[], minCols: number): boolean {
  if (parts.length < minCols) return false;
  const [type, date, name, , exercise] = parts;
  if (type !== "plan" && type !== "session") return false;
  if (!name || !exercise) return false;
  return type === "plan" || Boolean(date);
}

function parseCSVLine(line: string): string[] {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
