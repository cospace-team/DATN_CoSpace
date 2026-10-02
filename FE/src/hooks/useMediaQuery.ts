import { useCallback, useSyncExternalStore } from "react";

/**
 * Whether a CSS media query matches, kept in sync as the viewport changes.
 *
 * Use it to mount only the layout that is shown, instead of rendering a desktop and a mobile copy
 * of the same stateful component and hiding one with CSS (both copies would fetch and keep state).
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
}
