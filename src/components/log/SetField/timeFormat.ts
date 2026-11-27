import { secondsTime, timeSeconds, typedTime } from "../../../utils/timeField";
import type { FieldFormat } from ".";

/** Stored seconds typed as digits that fill from the right. */
export const timeFormat: FieldFormat = {
  inputMode: "numeric",
  placeholder: "00:00",
  show: secondsTime,
  type: typedTime,
  store: (text) => (text ? String(timeSeconds(text)) : ""),
  settle: (text) => secondsTime(String(timeSeconds(text))),
};
