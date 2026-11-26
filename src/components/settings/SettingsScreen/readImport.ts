import { CSVImport, importFromCSV } from "../../../utils/csv";
import { nothingFoundText } from "./importSummary";

/** One step of an import after a file is picked; each opens in the sheet. */
export type ImportStep =
  | { kind: "ready"; fileName: string; data: CSVImport }
  | { kind: "error"; fileName: string; message: string }
  | { kind: "done"; message: string };

export async function readImport(file: File): Promise<ImportStep> {
  try {
    const data = importFromCSV(await file.text());
    if (!data.plans.length && !data.sessions.length) {
      return { kind: "error", fileName: file.name, message: nothingFoundText(data.skippedRows) };
    }
    return { kind: "ready", fileName: file.name, data };
  } catch (err) {
    return { kind: "error", fileName: file.name, message: err instanceof Error ? err.message : String(err) };
  }
}
