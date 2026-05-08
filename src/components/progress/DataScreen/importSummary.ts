import { CSVImport } from "../../../utils/csv";

const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;

export const plansAndSessions = (plans: number, sessions: number) =>
  `${count(plans, "plan")} and ${count(sessions, "session")}`;

/** "17 plans and 168 sessions found", plus the rows the parser left out. */
export function foundText(data: CSVImport): string {
  const found = `${plansAndSessions(data.plans.length, data.sessions.length)} found`;
  if (!data.skippedRows) return found;
  return `${found}. ${count(data.skippedRows, "row")} skipped: a column or field was missing.`;
}

export function nothingFoundText(skippedRows: number): string {
  if (!skippedRows) return "No plans or sessions found in this file.";
  return `No plans or sessions found: ${count(skippedRows, "row")} skipped because a column or field was missing.`;
}

export function addedText(addedPlans: number, addedSessions: number): string {
  if (!addedPlans && !addedSessions) return "Nothing new: every plan and session was already here.";
  return `Added ${plansAndSessions(addedPlans, addedSessions)}.`;
}
