import type { OnboardStatus, StartupRouteTarget } from '@/startup/types';

export function startupRouteTarget(
  hasSession: boolean,
  onboardStatus: OnboardStatus,
): StartupRouteTarget {
  if (!hasSession) return 'auth';
  if (onboardStatus === 'no') return 'onboarding';
  if (onboardStatus === 'retry') return 'retry';
  return 'app';
}
