import { useSyncExternalStore } from "react";
import { saveToStorage } from "./storage";

/** The accents offered in Settings, in picker order. Their colours live in tokens.css as --accent-<id>. */
export const ACCENTS = [
  { id: "lime", name: "Lime" },
  { id: "amber", name: "Amber" },
  { id: "cyan", name: "Cyan" },
  { id: "violet", name: "Violet" },
  { id: "red", name: "Red" },
] as const;

export type AccentId = (typeof ACCENTS)[number]["id"];

export const DEFAULT_ACCENT: AccentId = "lime";

const STORAGE_KEY = "gym:accent";

const isAccent = (value: unknown): value is AccentId => ACCENTS.some((a) => a.id === value);

/** Reads the stored accent; anything missing, unknown or unreadable falls back to lime. */
export function loadAccent(): AccentId {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return isAccent(parsed) ? parsed : DEFAULT_ACCENT;
  } catch {
    return DEFAULT_ACCENT;
  }
}

/** Points the root's accent tokens at the chosen option. */
export function applyAccent(accent: AccentId): void {
  document.documentElement.dataset.accent = accent;
}

/** Stores and applies the accent; reports whether the browser kept it. A refused write changes nothing. */
export function saveAccent(accent: AccentId): boolean {
  if (!saveToStorage(STORAGE_KEY, accent)) return false;
  current = accent;
  applyAccent(accent);
  listeners.forEach((notify) => notify());
  return true;
}

let current: AccentId | null = null;
const listeners = new Set<() => void>();

const subscribe = (notify: () => void) => {
  listeners.add(notify);
  return () => void listeners.delete(notify);
};
const snapshot = () => (current ??= loadAccent());

export function useAccent(): AccentId {
  return useSyncExternalStore(subscribe, snapshot);
}
