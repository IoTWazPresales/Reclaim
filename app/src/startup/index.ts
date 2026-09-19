export type { OnboardStatus, StartupGateSnapshot, StartupPhase, StartupRouteTarget } from '@/startup/types';
export { StartupGateProvider, useStartupGate } from '@/startup/StartupGateContext';
export { useStartupGateState } from '@/startup/useStartupGate';
export { startupRouteTarget } from '@/startup/startupRouteTarget';
export { isNotificationPermissionDeferred } from '@/startup/notificationStartupGate';
export { StartupSplashDisclaimer } from '@/startup/StartupSplashDisclaimer';
export { runStartupNotificationPermissionGate } from '@/startup/notificationStartupGate';
export { useDashboardMotionStages } from '@/startup/useDashboardMotionStages';
export type { DashboardMotionFlags } from '@/startup/useDashboardMotionStages';
