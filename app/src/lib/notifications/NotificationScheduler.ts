// Notification Scheduler - Idempotent, deterministic notification planning
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../logger';
import { supabase } from '../supabase';
import { getNotificationPreferences } from '../notificationPreferences';
import { getUserSettings } from '../userSettings';
import { loadSleepSettings } from '../sleepSettings';

const PLAN_FINGERPRINT_KEY = '@reclaim/notifications/planFingerprint';
const PLAN_LAST_SCHEDULED_KEY = '@reclaim/notifications/lastScheduled';
const APP_TAG = 'reclaim';

// IMPORTANT: handler ensures notifications actually display while app is foreground/background
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export type NotificationLogicalKey =
  | 'morning_review'
  | 'mood_morning'
  | 'mood_evening'
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

function addMinutesToHHMM(hhmm: string, deltaMinutes: number): { hour: number; minute: number } {
  const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10));
  const base = (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
  const next = ((base + deltaMinutes) % (24 * 60) + (24 * 60)) % (24 * 60);
  const hour = Math.floor(next / 60);
  const minute = next % 60;
  return { hour, minute };
}

async function ensurePermissionsAndChannels(): Promise<boolean> {
  try {
    const perm = await Notifications.getPermissionsAsync();

    // Android: perm.granted is the main signal
    // iOS: can be PROVISIONAL (allowed silently) so treat that as granted too
    let granted =
      perm.granted ||
      perm.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
      perm.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED;

    if (!granted) {
      const req = await Notifications.requestPermissionsAsync();
      granted =
        req.granted ||
        req.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
        req.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED;
    }

    if (!granted) {
      logger.warn('[NotificationScheduler] Notifications permission not granted');
      return false;
    }

    // Android channels (safe on iOS; no-op)
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: undefined,
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    await Notifications.setNotificationChannelAsync('reminder-silent', {
      name: 'Reminders (Silent)',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: undefined,
      vibrationPattern: [0, 150],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    return true;
  } catch (e) {
    logger.warn('[NotificationScheduler] Failed to ensure permissions/channels', e);
    return false;
  }
}

/**
 * Build a stable notification plan based on user state
 */
export async function buildNotificationPlan(): Promise<NotificationPlan> {
  const notifications: PlannedNotification[] = [];

  try {
    const prefs = await getNotificationPreferences();
    const settings = await getUserSettings();
    const sleepSettings = await loadSleepSettings();

    // Master toggle: treat as enabled unless explicitly false
    const enabled = (prefs as any)?.enabled !== false;

    if (!enabled) {
      return { notifications: [], fingerprint: 'disabled' };
    }

    // Determine channel based on notification chime setting
    const chimeEnabled = settings.notificationChimeEnabled ?? true;
    const reminderChannelId = chimeEnabled ? 'reminder-chime' : 'reminder-silent';

    // Mood reminders (08:00 & 20:00) - check if explicitly disabled
    const moodRemindersEnabled = prefs.moodRemindersEnabled !== false;

    if (moodRemindersEnabled) {
      // Morning mood check-in (08:00)
      notifications.push({
        logicalKey: 'mood_morning',
        title: 'Morning check-in',
        body: 'How are you feeling? Tap to log.',
        data: { type: 'MOOD_REMINDER', dest: 'Mood', logicalKey: 'mood_morning', appTag: APP_TAG },
        trigger: { hour: 8, minute: 0, repeats: true } as Notifications.CalendarTriggerInput,
        channelId: reminderChannelId,
        categoryIdentifier: 'MOOD_REMINDER',
      });

      // Evening mood check-in (20:00)
      notifications.push({
        logicalKey: 'mood_evening',
        title: 'Evening check-in',
        body: 'Take a moment to reflect. Tap to log.',
        data: { type: 'MOOD_REMINDER', dest: 'Mood', logicalKey: 'mood_evening', appTag: APP_TAG },
        trigger: { hour: 20, minute: 0, repeats: true } as Notifications.CalendarTriggerInput,
        channelId: reminderChannelId,
        categoryIdentifier: 'MOOD_REMINDER',
      });
    }

    // Morning Review (daily at wake time + 30 min) - using sleep settings
    const typicalWakeTime = sleepSettings?.typicalWakeHHMM;
    if (typicalWakeTime) {
      const { hour, minute } = addMinutesToHHMM(typicalWakeTime, 30);

      notifications.push({
        logicalKey: 'morning_review',
        title: 'Morning Check-in',
        body: 'How did you sleep? Log your morning mood and energy.',
        data: { type: 'MORNING_REVIEW', dest: 'Home', logicalKey: 'morning_review', appTag: APP_TAG },
        trigger: { hour, minute, repeats: true } as Notifications.CalendarTriggerInput,
        channelId: reminderChannelId,
      });
    }

    // Sleep Bedtime Reminder - calculated from wake time minus target sleep minus 60 min buffer
    // Then scheduled 30 minutes before that calculated bedtime
    if (typicalWakeTime && sleepSettings?.targetSleepMinutes) {
      // Calculate bedtime: typical wake time minus target sleep minutes minus 60 min buffer
      const wakeMinutes = addMinutesToHHMM(typicalWakeTime, 0);
      const wakeTotalMinutes = wakeMinutes.hour * 60 + wakeMinutes.minute;
      const bedtimeTotalMinutes = (wakeTotalMinutes - sleepSettings.targetSleepMinutes - 60 + (24 * 60)) % (24 * 60);
      const bedtimeHour = Math.floor(bedtimeTotalMinutes / 60);
      const bedtimeMinute = bedtimeTotalMinutes % 60;
      const bedtimeHHMM = `${bedtimeHour.toString().padStart(2, '0')}:${bedtimeMinute.toString().padStart(2, '0')}`;
      
      // Schedule 30 minutes before calculated bedtime
      const { hour, minute } = addMinutesToHHMM(bedtimeHHMM, -30);

      notifications.push({
        logicalKey: 'sleep_bedtime',
        title: 'Wind down?',
        body: 'Aim for your target sleep tonight.',
        data: { type: 'SLEEP_BEDTIME', dest: 'Sleep', logicalKey: 'sleep_bedtime', appTag: APP_TAG },
        trigger: { hour, minute, repeats: true } as Notifications.CalendarTriggerInput,
        channelId: reminderChannelId,
        categoryIdentifier: 'SLEEP_REMINDER',
      });
    }

    // Sleep Morning Confirm (at typical wake time) - using sleep settings
    if (typicalWakeTime) {
      const [wh, wm] = typicalWakeTime.split(':').map(Number);
      const wakeHour = Number.isFinite(wh) ? wh : 7;
      const wakeMinute = Number.isFinite(wm) ? wm : 0;

      notifications.push({
        logicalKey: 'sleep_confirm',
        title: 'Good morning ☀️',
        body: 'Confirm last night\'s sleep?',
        data: { type: 'SLEEP_CONFIRM', dest: 'Sleep', logicalKey: 'sleep_confirm', appTag: APP_TAG },
        trigger: { hour: wakeHour, minute: wakeMinute, repeats: true } as Notifications.CalendarTriggerInput,
        channelId: reminderChannelId,
        categoryIdentifier: 'SLEEP_REMINDER',
      });
    }
  } catch (error) {
    logger.warn('[NotificationScheduler] Error building notification plan:', error);
  }

  const fingerprint = computePlanFingerprint(notifications);
  return { notifications, fingerprint };
}

/**
 * Compute a stable fingerprint of the notification plan
 */
function computePlanFingerprint(notifications: PlannedNotification[]): string {
  const sorted = [...notifications].sort((a, b) => a.logicalKey.localeCompare(b.logicalKey));
  const summary = sorted.map((n) => {
    const t = n.trigger as any;
    return `${n.logicalKey}:${t?.hour ?? 0}:${t?.minute ?? 0}:${t?.repeats ?? false}:${n.channelId ?? ''}:${n.categoryIdentifier ?? ''}`;
  });
  return summary.join('|');
}

async function loadLastFingerprint(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PLAN_FINGERPRINT_KEY);
  } catch {
    return null;
  }
}

async function saveFingerprint(fingerprint: string): Promise<void> {
  try {
    await AsyncStorage.setItem(PLAN_FINGERPRINT_KEY, fingerprint);
    await AsyncStorage.setItem(PLAN_LAST_SCHEDULED_KEY, new Date().toISOString());
  } catch (error) {
    logger.warn('[NotificationScheduler] Failed to save plan fingerprint:', error);
  }
}

async function getAppScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    return all.filter((n) => {
      const data = n.content.data as any;
      return data?.appTag === APP_TAG;
    });
  } catch (error) {
    logger.warn('[NotificationScheduler] Failed to get scheduled notifications:', error);
    return [];
  }
}

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
    logger.warn('[NotificationScheduler] Failed to cancel app notifications:', error);
  }
}

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
    logger.warn(`[NotificationScheduler] Failed to schedule ${planned.logicalKey}:`, error);
    return null;
  }
}

/**
 * Reconcile notifications: schedule missing/changed ones
 * Main entry point called on app startup
 */
export async function reconcileNotifications(): Promise<void> {
  try {
    if (__DEV__) logger.debug('[NotificationScheduler] Starting reconciliation');

    const ok = await ensurePermissionsAndChannels();
    if (!ok) return;

    const newPlan = await buildNotificationPlan();
    const lastFingerprint = await loadLastFingerprint();

    if (__DEV__) {
      logger.debug('[NotificationScheduler] Fingerprints:', { last: lastFingerprint, new: newPlan.fingerprint });
    }

    if (lastFingerprint === newPlan.fingerprint) {
      if (__DEV__) logger.debug('[NotificationScheduler] Plan unchanged, skipping');
      return;
    }

    await cancelAllAppNotifications();

    for (const planned of newPlan.notifications) {
      await scheduleNotification(planned);
    }

    await saveFingerprint(newPlan.fingerprint);

    if (__DEV__) {
      logger.debug(`[NotificationScheduler] Reconciled ${newPlan.notifications.length} notifications`);
    }

    logReconciliationEvent(newPlan.notifications.length).catch(() => {});
  } catch (error) {
    logger.error('[NotificationScheduler] Failed to reconcile notifications:', error);
  }
}

/**
 * Force re-schedule all notifications (for settings changes)
 */
export async function forceRescheduleNotifications(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PLAN_FINGERPRINT_KEY);
    await reconcileNotifications();
  } catch (error) {
    logger.warn('[NotificationScheduler] Failed to force reschedule:', error);
  }
}

/**
 * Diagnostics for debugging scheduled notifications
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
    logger.warn('[NotificationScheduler] Failed to get diagnostics:', error);
    return null;
  }
}

async function logReconciliationEvent(count: number): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('notification_events').insert({
      user_id: user.id,
      event_type: 'reconcile',
      notification_count: count,
      created_at: new Date().toISOString(),
    });
  } catch {
    // ignore analytics failures
  }
}
