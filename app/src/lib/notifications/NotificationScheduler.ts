// Notification Scheduler - Idempotent, deterministic notification planning
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../logger';
import { supabase } from '../supabase';
import { getNotificationPreferences } from '../notificationPreferences';
import { getUserSettings } from '../userSettings';

const PLAN_FINGERPRINT_KEY = '@reclaim/notifications/planFingerprint';
const PLAN_LAST_SCHEDULED_KEY = '@reclaim/notifications/lastScheduled';
const APP_TAG = 'reclaim';

export type NotificationLogicalKey =
  | 'morning_review'
  | 'evening_checkin'
  | 'hydration_nudge'
  | 'meditation_reminder'
  | 'sleep_bedtime'
  | 'sleep_confirm';

export type PlannedNotification = {
  logicalKey: NotificationLogicalKey;
  title: string;
  body: string;
  data?: Record<string, any>;
  trigger: Notifications.NotificationTriggerInput;
  channelId?: string;
  categoryIdentifier?: string;
};

export type NotificationPlan = {
  notifications: PlannedNotification[];
  fingerprint: string;
};

/**
 * Build a stable notification plan based on user state
 */
export async function buildNotificationPlan(): Promise<NotificationPlan> {
  const notifications: PlannedNotification[] = [];

  try {
    // Get user preferences
    const prefs = await getNotificationPreferences();
    const settings = await getUserSettings();

    // Skip if notifications are globally disabled
    if (!prefs.enabled) {
      return { notifications: [], fingerprint: 'disabled' };
    }

    // Morning Review (daily at wake time + 30 min)
    if (settings?.sleep?.typicalWakeTime) {
      const [wh, wm] = settings.sleep.typicalWakeTime.split(':').map(Number);
      const reviewHour = wh || 7;
      const reviewMinute = Math.min(59, (wm || 0) + 30);

      notifications.push({
        logicalKey: 'morning_review',
        title: 'Morning Check-in',
        body: 'How did you sleep? Log your morning mood and energy.',
        data: { type: 'MORNING_REVIEW', dest: 'Home', logicalKey: 'morning_review', appTag: APP_TAG },
        trigger: { hour: reviewHour, minute: reviewMinute, repeats: true } as Notifications.CalendarTriggerInput,
        channelId: 'default',
      });
    }

    // Evening Check-in (daily at 20:00)
    if (!prefs.quietHoursEnabled || prefs.quietHoursEnd < 20) {
      notifications.push({
        logicalKey: 'evening_checkin',
        title: 'Evening Reflection',
        body: 'Take a moment to reflect on your day.',
        data: { type: 'EVENING_CHECKIN', dest: 'Mood', logicalKey: 'evening_checkin', appTag: APP_TAG },
        trigger: { hour: 20, minute: 0, repeats: true } as Notifications.CalendarTriggerInput,
        channelId: 'default',
      });
    }

    // Sleep Bedtime Reminder (if enabled, 30 min before target bedtime)
    if (settings?.sleep?.targetBedtime) {
      const [bh, bm] = settings.sleep.targetBedtime.split(':').map(Number);
      const reminderHour = bh || 22;
      const reminderMinute = Math.max(0, (bm || 0) - 30);

      notifications.push({
        logicalKey: 'sleep_bedtime',
        title: 'Bedtime Reminder',
        body: 'Time to start winding down for better sleep.',
        data: { type: 'SLEEP_BEDTIME', dest: 'Sleep', logicalKey: 'sleep_bedtime', appTag: APP_TAG },
        trigger: { hour: reminderHour, minute: reminderMinute, repeats: true } as Notifications.CalendarTriggerInput,
        channelId: 'reminder-silent',
        categoryIdentifier: 'SLEEP_REMINDER',
      });
    }
  } catch (error) {
    logger.warn('Error building notification plan:', error);
  }

  // Compute stable fingerprint
  const fingerprint = computePlanFingerprint(notifications);

  return { notifications, fingerprint };
}

/**
 * Compute a stable hash/fingerprint of the notification plan
 */
function computePlanFingerprint(notifications: PlannedNotification[]): string {
  const sorted = [...notifications].sort((a, b) => a.logicalKey.localeCompare(b.logicalKey));
  const summary = sorted.map((n) => {
    const trigger = n.trigger as any;
    return `${n.logicalKey}:${trigger?.hour || 0}:${trigger?.minute || 0}:${trigger?.repeats}`;
  });
  return summary.join('|');
}

/**
 * Load the last scheduled plan fingerprint
 */
async function loadLastFingerprint(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PLAN_FINGERPRINT_KEY);
  } catch {
    return null;
  }
}

/**
 * Save the current plan fingerprint
 */
async function saveFingerprint(fingerprint: string): Promise<void> {
  try {
    await AsyncStorage.setItem(PLAN_FINGERPRINT_KEY, fingerprint);
    await AsyncStorage.setItem(PLAN_LAST_SCHEDULED_KEY, new Date().toISOString());
  } catch (error) {
    logger.warn('Failed to save plan fingerprint:', error);
  }
}

/**
 * Get all scheduled notifications created by this app
 */
async function getAppScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    return all.filter((n) => {
      const data = n.content.data as any;
      return data?.appTag === APP_TAG;
    });
  } catch (error) {
    logger.warn('Failed to get scheduled notifications:', error);
    return [];
  }
}

/**
 * Cancel all app-created scheduled notifications
 */
async function cancelAllAppNotifications(): Promise<void> {
  try {
    const appNotifs = await getAppScheduledNotifications();
    for (const notif of appNotifs) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
    if (__DEV__) {
      logger.debug(`[NotificationScheduler] Cancelled ${appNotifs.length} notifications`);
    }
  } catch (error) {
    logger.warn('Failed to cancel app notifications:', error);
  }
}

/**
 * Schedule a single notification
 */
async function scheduleNotification(planned: PlannedNotification): Promise<string | null> {
  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: planned.title,
        body: planned.body,
        data: planned.data,
        categoryIdentifier: planned.categoryIdentifier,
      },
      trigger: planned.trigger,
    });

    if (__DEV__) {
      logger.debug(`[NotificationScheduler] Scheduled ${planned.logicalKey}: ${identifier}`);
    }

    return identifier;
  } catch (error) {
    logger.warn(`Failed to schedule ${planned.logicalKey}:`, error);
    return null;
  }
}

/**
 * Reconcile notifications: schedule missing/changed ones
 * This is the main entry point called on app startup
 */
export async function reconcileNotifications(): Promise<void> {
  try {
    if (__DEV__) {
      logger.debug('[NotificationScheduler] Starting reconciliation');
    }

    // Build new plan
    const newPlan = await buildNotificationPlan();

    // Load last fingerprint
    const lastFingerprint = await loadLastFingerprint();

    if (__DEV__) {
      logger.debug('[NotificationScheduler] Fingerprints:', {
        last: lastFingerprint,
        new: newPlan.fingerprint,
      });
    }

    // If plan hasn't changed, do nothing (idempotent!)
    if (lastFingerprint === newPlan.fingerprint) {
      if (__DEV__) {
        logger.debug('[NotificationScheduler] Plan unchanged, skipping');
      }
      return;
    }

    // Plan has changed - cancel old and schedule new
    await cancelAllAppNotifications();

    // Schedule new plan
    for (const planned of newPlan.notifications) {
      await scheduleNotification(planned);
    }

    // Save new fingerprint
    await saveFingerprint(newPlan.fingerprint);

    if (__DEV__) {
      logger.debug(`[NotificationScheduler] Reconciled ${newPlan.notifications.length} notifications`);
    }

    // Log to Supabase for analytics (non-blocking)
    logReconciliationEvent(newPlan.notifications.length).catch(() => {});
  } catch (error) {
    logger.error('Failed to reconcile notifications:', error);
  }
}

/**
 * Force re-schedule all notifications (for settings changes)
 */
export async function forceRescheduleNotifications(): Promise<void> {
  try {
    // Clear fingerprint to force reconcile
    await AsyncStorage.removeItem(PLAN_FINGERPRINT_KEY);
    await reconcileNotifications();
  } catch (error) {
    logger.warn('Failed to force reschedule:', error);
  }
}

/**
 * Get diagnostic information about scheduled notifications
 */
export async function getNotificationDiagnostics() {
  try {
    const scheduled = await getAppScheduledNotifications();
    const lastFingerprint = await loadLastFingerprint();
    const lastScheduled = await AsyncStorage.getItem(PLAN_LAST_SCHEDULED_KEY);

    return {
      scheduledCount: scheduled.length,
      scheduled: scheduled.map((n) => ({
        identifier: n.identifier,
        logicalKey: (n.content.data as any)?.logicalKey,
        title: n.content.title,
        trigger: n.trigger,
      })),
      lastFingerprint,
      lastScheduled,
    };
  } catch (error) {
    logger.warn('Failed to get diagnostics:', error);
    return null;
  }
}

/**
 * Log reconciliation event to Supabase (analytics)
 */
async function logReconciliationEvent(count: number): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('notification_events').insert({
      user_id: user.id,
      event_type: 'reconcile',
      notification_count: count,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Ignore analytics failures
  }
}
