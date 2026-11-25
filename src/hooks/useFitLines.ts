import { RefObject, useLayoutEffect } from "react";

/**
 * Keeps the element's text no taller than `lines` lines of its CSS type size, at the
 * largest size that allows. The size never drops below the one at which `maxLines`
 * lines fill that height; text that still does not fit there gets `data-clamp` so CSS
 * can cut it. The CSS line-height must be unitless so it scales with the size. It fits
 * again when the text, the parent's width or the web font changes.
 */
export function useFitLines(ref: RefObject<HTMLElement | null>, text: string, lines: number, maxLines: number) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let live = true;
    const fit = () => {
      if (!live) return;
      el.style.fontSize = "";
      delete el.dataset.clamp;
      const style = getComputedStyle(el);
      const max = parseFloat(style.fontSize);
      const leading = parseFloat(style.lineHeight) / max;
      const height = lines * leading * max;
      const fits = (size: number) => {
        el.style.fontSize = `${size}px`;
        const lineHeight = leading * size;
        return Math.round(el.scrollHeight / lineHeight) * lineHeight <= height + 0.5;
      };
      if (fits(max)) {
        el.style.fontSize = "";
        return;
      }
      const min = height / (maxLines * leading);
      if (!fits(min)) {
        el.dataset.clamp = "";
        return;
      }
      // Fewer lines only ever need a smaller size, so the fit is monotonic.
      let lo = min;
      let hi = max;
      while (hi - lo > 0.5) {
        const mid = (lo + hi) / 2;
        if (fits(mid)) lo = mid;
        else hi = mid;
      }
      el.style.fontSize = `${lo}px`;
    };
    fit();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(fit);
    if (el.parentElement) observer?.observe(el.parentElement);
    document.fonts?.ready.then(fit);
    return () => {
      live = false;
      observer?.disconnect();
    };
  }, [ref, text, lines, maxLines]);
}
