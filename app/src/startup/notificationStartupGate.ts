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

/** Phase C — request permission on splash, then reconcile. */
export async function runStartupNotificationPermissionGate(): Promise<boolean> {
  const granted = await ensureNotificationPermission();
  markNotificationPermissionGateComplete();
  await clearBadge().catch((e) => {
    if (__DEV__) logger.debug('[startup/notifications]', e);
  });
  await reconcileNotifications().catch((e) => {
    if (__DEV__) logger.debug('[startup/notifications] reconcile failed', e);
  });
  logger.debug('[STARTUP_GATE] notification permission gate complete', { granted });
  return granted;
}
