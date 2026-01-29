/**
 * Unified notification reconcile entrypoint. Gates daily-plan scheduling on auth + onboarded.
 */

import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import { getHasOnboarded } from '@/state/onboarding';
import {
  reconcileNotifications,
  buildNotificationPlan,
  getNotificationDiagnostics,
} from '@/lib/notifications/NotificationScheduler';

export type ScheduleResult = {
  plannedCount: number;
  scheduledCount: number;
  cancelledCount: number;
  nextFireAt: string | null;
  reasonsSkipped: string[];
};

/**
 * Reconcile notification schedule. When allowUnauthed is false, daily-plan
 * notifications (morning review, mood, sleep) are not scheduled unless the
 * user is signed in and onboarded.
 */
export async function reconcile(options: {
  trigger?: string;
  allowUnauthed?: boolean;
}): Promise<ScheduleResult> {
  const { allowUnauthed = false } = options;
  const empty: ScheduleResult = {
    plannedCount: 0,
    scheduledCount: 0,
    cancelledCount: 0,
    nextFireAt: null,
    reasonsSkipped: [],
  };

  if (!allowUnauthed) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        logger.info('[NOTIF_RECONCILE] Skipped: no auth');
        return { ...empty, reasonsSkipped: ['no auth'] };
      }
      const onboarded = await getHasOnboarded(user.id);
      if (!onboarded) {
        logger.info('[NOTIF_RECONCILE] Skipped: not onboarded');
        return { ...empty, reasonsSkipped: ['not onboarded'] };
      }
    } catch (e) {
      logger.warn('[NOTIF_RECONCILE] Auth/onboard check failed', e);
      return { ...empty, reasonsSkipped: ['auth check failed'] };
    }
  }

  try {
    logger.debug('[NOTIF] reconcile starting');
    const diagBefore = await getNotificationDiagnostics();
    const cancelledCount = diagBefore?.scheduledCount ?? 0;

    const plan = await buildNotificationPlan();
    const plannedCount = plan.notifications.length;

    await reconcileNotifications();

    const diagAfter = await getNotificationDiagnostics();
    const scheduledCount = diagAfter?.scheduledCount ?? 0;
    const plannedKeys = plan.notifications.map((n) => n.logicalKey as string);
    const actualKeys = (diagAfter?.scheduled ?? []).map((s) => (s as any).logicalKey).filter(Boolean) as string[];
    const plannedSet = new Set(plannedKeys);
    const actualSet = new Set(actualKeys);
    const missingKeys = plannedKeys.filter((k) => !actualSet.has(k));
    const extraKeys = actualKeys.filter((k) => !plannedSet.has(k));
    const trim = (arr: string[]) => {
      if (arr.length <= 10) return arr.join(',') || 'none';
      return arr.slice(0, 10).join(',') + ' +' + (arr.length - 10) + ' more';
    };
    const missing = trim(missingKeys);
    const extra = trim(extraKeys);

    logger.info('[NOTIF_PLAN] plannedCount=' + plannedCount);
    logger.info('[NOTIF_ACTUAL] scheduledCount=' + scheduledCount + ' missing=' + missing + ' extra=' + extra);
    return {
      plannedCount,
      scheduledCount,
      cancelledCount,
      nextFireAt: null,
      reasonsSkipped: [],
    };
  } catch (e) {
    logger.warn('[NOTIF_RECONCILE] Failed', e);
    return {
      ...empty,
      reasonsSkipped: [e instanceof Error ? e.message : 'reconcile failed'],
    };
  }
}
