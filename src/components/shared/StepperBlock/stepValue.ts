/** Moves value by delta, rounded to 2 decimals so 0.1 steps don't drift, never below min. */
export function stepValue(value: number, delta: number, min: number): number {
  return Math.max(min, Math.round((value + delta) * 100) / 100);
}
