import { useCallback, useSyncExternalStore } from "react";

/**
 * The wide layout's media query (--breakpoint-wide in tokens.css). Like a CSS
 * media query it cannot read the custom property; breakpoints.test.ts keeps it in step.
 */
export const WIDE_QUERY = "(min-width: 1024px)";

/** Whether the media query matches now, updating when it starts or stops matching. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
}
