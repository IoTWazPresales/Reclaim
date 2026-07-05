import React, { createContext, useContext } from 'react';
import type { StartupGateSnapshot } from '@/startup/types';

export type StartupGateContextValue = StartupGateSnapshot & {
  /** Advance past disclaimer phase (Phase B). */
  completeDisclaimer: () => void;
  /** Advance past notification permission phase (Phase C). */
  completeNotifications: () => void;
  /** Phase E: dashboard may enable Skia/Reanimated layers (wired in a later pass). */
  dashboardMotionEnabled: boolean;
  enableDashboardMotion: () => void;
};

const defaultSnapshot: StartupGateSnapshot = {
  phase: 'splash_core',
  routeTarget: 'auth',
  shouldHoldSplash: true,
  canMountApp: false,
  splashDismissed: false,
  splashMessage: 'Loading...',
};

const StartupGateContext = createContext<StartupGateContextValue>({
  ...defaultSnapshot,
  completeDisclaimer: () => {},
  completeNotifications: () => {},
  dashboardMotionEnabled: false,
  enableDashboardMotion: () => {},
});

export function useStartupGate(): StartupGateContextValue {
  return useContext(StartupGateContext);
}

export const StartupGateProvider = StartupGateContext.Provider;
