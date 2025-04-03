import { TrainingPlan, WorkoutSession } from "../types";
import { generateId } from "./id";

const CSV_HEADER = "type,date,name,desc_notes,exercise,muscle,weight,reps";

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
          set.weight,
          set.reps,
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

export function importFromCSV(csv: string): {
  plans: TrainingPlan[];
  sessions: WorkoutSession[];
} {
  const lines = csv.split("\n");
  if (lines.length === 0) return { plans: [], sessions: [] };

  const header = lines[0].trim();
  if (header !== CSV_HEADER) {
    throw new Error("Invalid CSV format: Header mismatch.");
  }

  const plansMap = new Map<string, TrainingPlan>();
  const sessionRows: string[][] = [];

  // First pass: Build Plans and collect session rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = parseCSVLine(line);
    if (parts.length < 8) continue;

    const [type, _date, name, desc_notes, exercise, muscle] = parts;

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
        });
      }
    } else if (type === "session") {
      sessionRows.push(parts);
    }
  }

  const sessionsMap = new Map<string, WorkoutSession>();

  // Second pass: Process sessions using plan info
  for (const parts of sessionRows) {
    const [_, date, name, desc_notes, exercise, muscle, weight, reps] = parts;
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
        sets: [],
      };
      session.exercises.push(exLog);
    }

    if (weight && reps) {
      exLog.sets.push({
        id: generateId(),
        weight,
        reps,
      });
    }
  }

  return {
    plans: Array.from(plansMap.values()),
    sessions: Array.from(sessionsMap.values()),
  };
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
