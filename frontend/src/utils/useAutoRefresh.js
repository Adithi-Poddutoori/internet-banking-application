import { useEffect, useRef } from 'react';

/**
 * Automatically re-calls `load` on a fixed interval and whenever the
 * browser tab regains visibility (e.g. switching from Chrome to Edge).
 *
 * Uses a ref so pages do NOT need useCallback — any inline `load` works.
 *
 * @param {() => void} load   - the data-fetch function for the page
 * @param {number}     ms     - polling interval in milliseconds (default 15 s)
 */
export function useAutoRefresh(load, ms = 15000) {
  const loadRef = useRef(load);
  useEffect(() => { loadRef.current = load; });

  useEffect(() => {
    const interval = setInterval(() => loadRef.current(), ms);
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadRef.current();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [ms]);
}
