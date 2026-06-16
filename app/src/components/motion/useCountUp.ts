import { useEffect, useState } from 'react';

/** Count from 0 → target once on mount / when target changes. */
export function useCountUp(target: number, reduceMotion: boolean, durationMs = 720): number {
  const safe = Math.max(0, Math.round(target));
  const [display, setDisplay] = useState(reduceMotion ? safe : 0);

  useEffect(() => {
    if (reduceMotion) {
      setDisplay(safe);
      return;
    }
    setDisplay(0);
    const started = Date.now();
    const tick = () => {
      const p = Math.min(1, (Date.now() - started) / durationMs);
      setDisplay(Math.round(safe * p));
      if (p < 1) requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [safe, reduceMotion, durationMs]);

  return display;
}
