import { useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';

import { useStartupGate } from '@/startup/StartupGateContext';

/** Cumulative delays (ms) after interactions settle — hero → SVG tiles → celebrate rings. */
const STAGE_DELAYS_MS = [100, 240, 380] as const;

export type DashboardMotionFlags = {
  /** Skia starfield, brain, connectors */
  heroSkia: boolean;
  /** Hero ring / brain animation loops */
  heroAnimate: boolean;
  /** Thirty-day arc + state tiles (react-native-svg + Reanimated) */
  svgDecor: boolean;
  /** Celebrate row progress rings (Skia + Reanimated) */
  celebrate: boolean;
};

const ALL_ENABLED: DashboardMotionFlags = {
  heroSkia: true,
  heroAnimate: true,
  svgDecor: true,
  celebrate: true,
};

const ALL_DISABLED: DashboardMotionFlags = {
  heroSkia: false,
  heroAnimate: false,
  svgDecor: false,
  celebrate: false,
};

/**
 * Phase E — stagger heavy Dashboard layers once per app session after splash gate clears.
 * Re-entering Dashboard later enables everything immediately (no behaviour change vs before).
 */
export function useDashboardMotionStages(screenActive: boolean): DashboardMotionFlags {
  const { splashDismissed, enableDashboardMotion } = useStartupGate();
  const [stage, setStage] = useState(0);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!screenActive || !splashDismissed) {
      setStage(0);
      return;
    }

    if (completedRef.current) {
      setStage(STAGE_DELAYS_MS.length);
      return;
    }

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const task = InteractionManager.runAfterInteractions(() => {
      STAGE_DELAYS_MS.forEach((delay, index) => {
        timers.push(
          setTimeout(() => {
            if (!cancelled) setStage(index + 1);
          }, delay),
        );
      });
      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          completedRef.current = true;
          enableDashboardMotion();
        }, STAGE_DELAYS_MS[STAGE_DELAYS_MS.length - 1]),
      );
    });

    return () => {
      cancelled = true;
      task.cancel();
      timers.forEach(clearTimeout);
    };
  }, [screenActive, splashDismissed, enableDashboardMotion]);

  if (completedRef.current || stage >= STAGE_DELAYS_MS.length) {
    return ALL_ENABLED;
  }

  if (stage === 0) {
    return ALL_DISABLED;
  }

  if (stage === 1) {
    return { heroSkia: true, heroAnimate: true, svgDecor: false, celebrate: false };
  }

  if (stage === 2) {
    return { heroSkia: true, heroAnimate: true, svgDecor: true, celebrate: false };
  }

  return ALL_ENABLED;
}
