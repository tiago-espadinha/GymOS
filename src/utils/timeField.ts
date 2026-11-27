import { formatClock } from "../hooks/useTimer";

// The Time field takes digits that fill from the right, since a number pad has no colon:
// 45 is 00:45, 2000 is 20:00, and a fifth and sixth digit are hours.
const digits = (text: string) => text.replace(/\D/g, "").replace(/^0+/, "").slice(0, 6);

/** The field's text while typing; empty when no digit is left. */
export function typedTime(text: string): string {
  const typed = digits(text);
  if (!typed) return "";
  const padded = typed.padStart(4, "0");
  const hours = padded.slice(0, -4);
  return `${hours ? `${hours}:` : ""}${padded.slice(-4, -2)}:${padded.slice(-2)}`;
}

export function timeSeconds(text: string): number {
  const padded = digits(text).padStart(6, "0");
  return Number(padded.slice(0, 2)) * 3600 + Number(padded.slice(2, 4)) * 60 + Number(padded.slice(4));
}

/** Stored seconds as the field shows them; empty for no time. */
export const secondsTime = (seconds: string): string => (Number(seconds) > 0 ? formatClock(Number(seconds) * 1000) : "");
