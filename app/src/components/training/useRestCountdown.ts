import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';

interface UseRestCountdownOptions {
  targetSeconds: number;
  isPaused: boolean;
  onComplete: () => void;
}

interface RestCountdownState {
  remaining: number;
  progress: number;
  extend: (seconds: number) => void;
}

/**
 * Pure logic hook for rest-timer countdown.
 * Handles background/foreground transitions and extend-without-jump.
 */
export function useRestCountdown({
  targetSeconds,
  isPaused,
  onComplete,
}: UseRestCountdownOptions): RestCountdownState {
  const [remaining, setRemaining] = useState(targetSeconds);
  const startTimeRef = useRef(Date.now());
  const elapsedRef = useRef(0);
  const appStateRef = useRef(AppState.currentState);
  const extendingRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (extendingRef.current) {
      extendingRef.current = false;
      return;
    }
    startTimeRef.current = Date.now();
    elapsedRef.current = 0;
    setRemaining(targetSeconds);
  }, [targetSeconds]);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const totalElapsed = Math.floor(
        (now - startTimeRef.current + elapsedRef.current) / 1000,
      );
      const next = Math.max(0, targetSeconds - totalElapsed);
      setRemaining(next);
      if (next === 0) onCompleteRef.current();
    }, 100);

    return () => clearInterval(interval);
  }, [isPaused, targetSeconds]);

  useEffect(() => {
    const sub = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (
          appStateRef.current.match(/inactive|background/) &&
          nextAppState === 'active'
        ) {
          if (!isPaused) {
            const now = Date.now();
            const totalElapsed = Math.floor(
              (now - startTimeRef.current + elapsedRef.current) / 1000,
            );
            const next = Math.max(0, targetSeconds - totalElapsed);
            setRemaining(next);
            if (next === 0) onCompleteRef.current();
          }
        } else if (nextAppState.match(/inactive|background/)) {
          const now = Date.now();
          elapsedRef.current += now - startTimeRef.current;
          startTimeRef.current = now;
        }
        appStateRef.current = nextAppState;
      },
    );
    return () => sub.remove();
  }, [isPaused, targetSeconds]);

  const extend = useCallback(
    (seconds: number) => {
      const now = Date.now();
      const totalElapsed = Math.floor(
        (now - startTimeRef.current + elapsedRef.current) / 1000,
      );
      startTimeRef.current = now;
      elapsedRef.current = 0;
      extendingRef.current = true;
      setRemaining(targetSeconds + seconds - totalElapsed);
    },
    [targetSeconds],
  );

  const progress = targetSeconds > 0 ? 1 - remaining / targetSeconds : 0;

  return { remaining, progress, extend };
}
