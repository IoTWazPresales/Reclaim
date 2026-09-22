import { hasNotificationPermission } from '@/lib/notifications/permission';
import { clearBadge } from '@/lib/notifications/BadgeManager';
import { logger } from '@/lib/logger';

/**
 * Start notification housekeeping after the application shell is allowed to render.
 * None of this work may request permission or hold the splash screen.
 */
export function runStartupNotificationPermissionGate(): void {
  void hasNotificationPermission()
    .then((granted) => {
      logger.info('[STARTUP_GATE] existing notification permission inspected', { granted });
    })
    .catch((e) => {
      if (__DEV__) logger.debug('[startup/notifications] permission inspection failed', e);
      else logger.warn('[STARTUP_GATE] permission inspection failed', e);
    });

  void clearBadge().catch((e) => {
    if (__DEV__) logger.debug('[startup/notifications]', e);
  });
}
