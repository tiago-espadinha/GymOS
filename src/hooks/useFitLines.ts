import { RefObject, useLayoutEffect } from "react";

/** How many lines an element's text takes, clamped or not. */
function lineCount(el: HTMLElement): number {
  return Math.round(el.scrollHeight / parseFloat(getComputedStyle(el).lineHeight));
}

/**
 * Sets `data-fit` on the element to the first of `steps` (0, 1, …) at which its text
 * takes at most `maxLines` lines, or to the last step. CSS maps each step to a smaller
 * type size. It fits again when the text, the parent's width or the web font changes.
 */
export function useFitLines(ref: RefObject<HTMLElement | null>, text: string, maxLines: number, steps: number) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let live = true;
    const fit = () => {
      if (!live) return;
      for (let step = 0; step < steps; step++) {
        el.dataset.fit = String(step);
        if (lineCount(el) <= maxLines) return;
      }
    };
    fit();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(fit);
    if (el.parentElement) observer?.observe(el.parentElement);
    document.fonts?.ready.then(fit);
    return () => {
      live = false;
      observer?.disconnect();
    };
  }, [ref, text, maxLines, steps]);
}
