import { ensureNotificationPermission } from '@/lib/notifications/permission';
import { clearBadge } from '@/lib/notifications/BadgeManager';
import { reconcileNotifications } from '@/lib/notifications/NotificationScheduler';
import { logger } from '@/lib/logger';

/**
 * When true, useNotifications skips the cold-boot permission prompt.
 * Phase C of the startup gate calls runStartupNotificationPermissionGate().
 */
let permissionDeferredToStartupGate = true;

export function isNotificationPermissionDeferred(): boolean {
  return permissionDeferredToStartupGate;
}

export function markNotificationPermissionGateComplete(): void {
  permissionDeferredToStartupGate = false;
}

export function resetNotificationStartupGate(): void {
  permissionDeferredToStartupGate = true;
}

/**
 * Phase C — hold splash only for permission (+ badge clear).
 * Full reconcile runs in the background so it does not block AppNavigator mount (X-26).
 * Still uses setIntent → reconcileNotifications; does not schedule ad hoc.
 */
export async function runStartupNotificationPermissionGate(): Promise<boolean> {
  const granted = await ensureNotificationPermission();
  markNotificationPermissionGateComplete();
  await clearBadge().catch((e) => {
    if (__DEV__) logger.debug('[startup/notifications]', e);
  });

  // Background: do not await — splash / shell must not wait on plan build + OS schedule.
  void reconcileNotifications().catch((e) => {
    if (__DEV__) logger.debug('[startup/notifications] background reconcile failed', e);
    else logger.warn('[STARTUP_GATE] background reconcile failed', e);
  });

  logger.info('[STARTUP_GATE] notification permission gate complete (reconcile backgrounded)', {
    granted,
  });
  return granted;
}
