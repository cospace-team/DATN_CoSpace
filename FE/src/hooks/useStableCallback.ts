import { useCallback, useLayoutEffect, useRef } from 'react';

/**
 * Returns a function with a stable identity that always invokes the latest `fn`.
 *
 * Use it to hand a handler that closes over frequently-changing state to a React.memo'd child
 * (e.g. FloorPlanViewer) without breaking the child's memoization. The returned function is
 * meant for event handlers and effects — don't call it during render.
 */
export function useStableCallback<A extends unknown[], R>(
  fn: (...args: A) => R
): (...args: A) => R {
  const fnRef = useRef(fn);
  useLayoutEffect(() => {
    fnRef.current = fn;
  });
  return useCallback((...args: A) => fnRef.current(...args), []);
}
