import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { logger } from '@/lib/logger';
import { needsHealthDisclaimer } from '@/startup/healthDisclaimerGate';
import { resetNotificationStartupGate } from '@/startup/notificationStartupGate';
import type { OnboardStatus, StartupGateSnapshot, StartupPhase, StartupRouteTarget } from '@/startup/types';

type SessionLike = { user: { id: string } } | null;

type UseStartupGateArgs = {
  authLoading: boolean;
  session: SessionLike;
  onboardStatus: OnboardStatus;
  fontsReady: boolean;
};

export function useStartupGateState({
  authLoading,
  session,
  onboardStatus,
  fontsReady,
}: UseStartupGateArgs) {
  const [phase, setPhase] = useState<StartupPhase>('splash_core');
  const [disclaimerNeeded, setDisclaimerNeeded] = useState<boolean | null>(null);
  const [dashboardMotionEnabled, setDashboardMotionEnabled] = useState(false);

  const coreResolved =
    fontsReady && !authLoading && (!session || onboardStatus !== 'unknown');

  const routeTarget: StartupRouteTarget = !session
    ? 'auth'
    : onboardStatus === 'no'
      ? 'onboarding'
      : 'app';

  const prevRouteTargetRef = useRef<StartupRouteTarget | null>(null);

  useEffect(() => {
    setPhase('splash_core');
    setDisclaimerNeeded(null);
    setDashboardMotionEnabled(false);
    prevRouteTargetRef.current = null;
    resetNotificationStartupGate();
  }, [session?.user?.id]);

  useEffect(() => {
    if (!coreResolved) return;

    if (routeTarget === 'app') {
      if (prevRouteTargetRef.current !== 'app') {
        logger.debug('[STARTUP_GATE] core resolved → disclaimer');
        setPhase('disclaimer');
        setDisclaimerNeeded(null);
      }
    } else {
      logger.debug('[STARTUP_GATE] core resolved → ready (route=%s)', routeTarget);
      setPhase('ready');
    }

    prevRouteTargetRef.current = routeTarget;
  }, [coreResolved, routeTarget]);

  useEffect(() => {
    if (phase !== 'disclaimer') return;

    let cancelled = false;
    void needsHealthDisclaimer().then((needed) => {
      if (cancelled) return;
      setDisclaimerNeeded(needed);
      if (!needed) {
        logger.debug('[STARTUP_GATE] disclaimer skipped → notifications');
        setPhase('notifications');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [phase]);

  const completeDisclaimer = useCallback(() => {
    setDisclaimerNeeded(false);
    logger.debug('[STARTUP_GATE] disclaimer dismissed → notifications');
    setPhase('notifications');
  }, []);

  const completeNotifications = useCallback(() => {
    logger.debug('[STARTUP_GATE] notifications complete → ready');
    setPhase('ready');
  }, []);

  const enableDashboardMotion = useCallback(() => {
    setDashboardMotionEnabled(true);
  }, []);

  const shouldHoldSplash = !coreResolved || (routeTarget === 'app' && phase !== 'ready');

  const canMountApp = routeTarget === 'app' && phase === 'ready';

  const splashMessage = useMemo(() => {
    if (authLoading) return 'Checking sign-in...';
    if (!fontsReady) return 'Loading fonts...';
    if (session && onboardStatus === 'unknown') return 'Loading...';
    if (phase === 'disclaimer') return disclaimerNeeded ? 'Before you start...' : 'Loading...';
    if (phase === 'notifications') return 'Almost ready...';
    return 'Loading...';
  }, [authLoading, fontsReady, session, onboardStatus, phase, disclaimerNeeded]);

  const snapshot: StartupGateSnapshot = {
    phase,
    routeTarget,
    shouldHoldSplash,
    canMountApp,
    splashDismissed: false, // RootNavigator sets via provider merge
    splashMessage,
  };

  return {
    ...snapshot,
    disclaimerNeeded,
    dashboardMotionEnabled,
    completeDisclaimer,
    completeNotifications,
    enableDashboardMotion,
  };
}
