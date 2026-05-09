import type { KeyboardEvent } from 'react';

/** One Tab stop (the selected option); Up/Down/Home/End move between options, Enter or Space picks one. */
export function moveListboxFocus(e: KeyboardEvent<HTMLDivElement>) {
  const options = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="option"]'));
  const at = options.indexOf(document.activeElement as HTMLElement);
  const next = { ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: options.length - 1 }[e.key];
  if (next === undefined) return;
  e.preventDefault();
  options[Math.max(0, Math.min(options.length - 1, next))]?.focus();
}
