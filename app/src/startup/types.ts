/**
 * Startup gate phases — single ordered pipeline before heavy UI mounts.
 *
 * A splash_core  — fonts, auth, onboarding resolution
 * B disclaimer   — health disclaimer (blocking on splash)
 * C notifications — notification permission prompt (on splash)
 * D ready        — splash may fade; AppNavigator mounts once (no Skia overlap)
 * E dashboard_*  — owned by Dashboard via StartupGateContext (post-ready)
 */
export type StartupPhase =
  | 'splash_core'
  | 'disclaimer'
  | 'notifications'
  | 'ready';

export type OnboardStatus = 'unknown' | 'yes' | 'no';

export type StartupRouteTarget = 'auth' | 'onboarding' | 'app';

export type StartupGateSnapshot = {
  phase: StartupPhase;
  routeTarget: StartupRouteTarget;
  shouldHoldSplash: boolean;
  canMountApp: boolean;
  /** True once splash overlay has fully unmounted (after fade). */
  splashDismissed: boolean;
  splashMessage: string;
};
