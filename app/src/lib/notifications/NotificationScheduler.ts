// Notification Scheduler - Idempotent, deterministic notification planning
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../logger';
import { supabase } from '../supabase';
import { getNotificationPreferences } from '../notificationPreferences';
import { getUserSettings } from '../userSettings';
import { loadSleepSettings } from '../sleepSettings';
import { getIntents, type NotificationIntent } from './NotificationIntentStore';

const PLAN_FINGERPRINT_KEY = '@reclaim/notifications/planFingerprint';
const PLAN_LAST_SCHEDULED_KEY = '@reclaim/notifications/lastScheduled';
const APP_TAG = 'reclaim';

// IMPORTANT: handler ensures notifications actually display while app is foreground/background
Notifications.setNotificationHandler({
  handleNotification: async () => ({
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
  logicalKey: NotificationLogicalKey | string;
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

const typeDaily = (Notifications as any).SchedulableTriggerInputTypes?.DAILY ?? 'daily';
const typeCalendar = (Notifications as any).SchedulableTriggerInputTypes?.CALENDAR ?? 'calendar';
const typeTimeInterval = (Notifications as any).SchedulableTriggerInputTypes?.TIME_INTERVAL ?? 'timeInterval';

/**
 * Build a valid trigger for scheduleNotificationAsync.
 * Expo requires trigger to have `type` or `channelId`; we include both for cross-platform support.
 */
function buildTriggerForSchedule(
  planned: PlannedNotification
): Notifications.NotificationTriggerInput | null {
  const t = planned.trigger as any;
  const channelId = planned.channelId ?? 'default';

  // Immediate (null trigger)
  if (t === null || t === undefined) {
    return null;
  }

  // Daily trigger: { hour, minute, repeats }
  if (t.hour !== undefined && t.minute !== undefined) {
    if (Platform.OS === 'android') {
      return { type: typeDaily, hour: t.hour, minute: t.minute, channelId } as Notifications.NotificationTriggerInput;
    }
    return { type: typeCalendar, hour: t.hour, minute: t.minute, repeats: t.repeats ?? true, channelId } as Notifications.NotificationTriggerInput;
  }

  // Date trigger: { date }
  if (t.date) {
    return { type: typeCalendar, date: t.date, channelId } as Notifications.NotificationTriggerInput;
  }

  // Interval trigger: { seconds }
  if (t.seconds !== undefined) {
    return { type: typeTimeInterval, seconds: Math.max(1, Math.floor(t.seconds)), repeats: t.repeats ?? false, channelId } as Notifications.NotificationTriggerInput;
  }

  // Fallback: assume daily shape
  return { type: typeDaily, hour: t.hour ?? 8, minute: t.minute ?? 0, channelId } as Notifications.NotificationTriggerInput;
}

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

    await Notifications.setNotificationChannelAsync('reminder-chime', {
      name: 'Reclaim Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [100, 200, 100],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    await Notifications.setNotificationChannelAsync('mindfulness-health', {
      name: 'Mindfulness (Health Triggers)',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: undefined,
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
  const sorted = [...notifications].sort((a, b) => String(a.logicalKey).localeCompare(String(b.logicalKey)));
  const summary = sorted.map((n) => {
    const t = n.trigger as any;
    const key = String(n.logicalKey);
    if (t?.date) return `${key}:date:${t.date}`;
    if (t?.seconds !== undefined) return `${key}:interval:${t.seconds}`;
    if (t === null || t === undefined) return `${key}:immediate`;
    return `${key}:${t?.hour ?? 0}:${t?.minute ?? 0}:${t?.repeats ?? false}:${n.channelId ?? ''}:${n.categoryIdentifier ?? ''}`;
  });
  return summary.join('|');
}

/**
 * Build plan from intents (Phase 5.2 cutover)
 * Converts intent data to PlannedNotification for scheduling via reconcile.
 */
async function buildPlanFromIntents(): Promise<PlannedNotification[]> {
  const intents = await getIntents();
  const result: PlannedNotification[] = [];
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;

  for (const i of intents) {
    const d = i.data;
    const key = i.logicalKey;

    // MED_REMINDER: med:medId:doseTimeISO or med:medId:doseTimeISO:snooze
    if (d?.type === 'MED_REMINDER' && d.medId && d.scheduledFor) {
      const when = new Date(d.scheduledFor);
      if (when.getTime() < oneHourAgo) continue; // skip past
      const title = d.title ?? `Time to take medication`;
      const body = d.body ?? '';
      const channelId = d.channelId ?? 'reminder-chime';
      const data = { type: 'MED_REMINDER', medId: d.medId, scheduledFor: d.scheduledFor, appTag: APP_TAG };
      if (Platform.OS === 'android') {
        const seconds = Math.max(1, Math.floor((when.getTime() - now) / 1000));
        result.push({
          logicalKey: key,
          title,
          body,
          data,
          trigger: { seconds, repeats: false } as any,
          channelId,
          categoryIdentifier: 'MED_REMINDER',
        });
      } else {
        result.push({
          logicalKey: key,
          title,
          body,
          data,
          trigger: { date: when } as any,
          channelId,
          categoryIdentifier: 'MED_REMINDER',
        });
      }
      continue;
    }

    // MOOD_REMINDER: mood_morning, mood_evening
    if (d?.type === 'MOOD_REMINDER' && d.hour !== undefined) {
      result.push({
        logicalKey: key,
        title: d.title ?? 'Mood check-in',
        body: d.body ?? 'How are you feeling? Tap to log.',
        data: { type: 'MOOD_REMINDER', dest: 'Mood', logicalKey: key, appTag: APP_TAG },
        trigger: { hour: d.hour, minute: d.minute ?? 0, repeats: true } as any,
        channelId: d.channelId ?? 'reminder-chime',
        categoryIdentifier: 'MOOD_REMINDER',
      });
      continue;
    }

    // SLEEP_BEDTIME: wake - target - 60 min = bedtime
    if (d?.type === 'SLEEP_BEDTIME' && d.typicalWakeHHMM) {
      const [wh, wm] = d.typicalWakeHHMM.split(':').map(Number);
      const targetMin = d.targetMinutes ?? 480;
      const wakeMin = (wh ?? 7) * 60 + (wm ?? 0);
      const bedMin = (wakeMin - targetMin - 60 + 24 * 60) % (24 * 60);
      const h = Math.floor(bedMin / 60);
      const m = bedMin % 60;
      result.push({
        logicalKey: key,
        title: d.title ?? 'Wind down?',
        body: d.body ?? 'Aim for your target sleep tonight.',
        data: { type: 'SLEEP_BEDTIME', dest: 'Sleep', logicalKey: 'sleep_bedtime', appTag: APP_TAG },
        trigger: { hour: h, minute: m, repeats: true } as any,
        channelId: d.channelId ?? 'reminder-chime',
        categoryIdentifier: 'SLEEP_REMINDER',
      });
      continue;
    }
    if (d?.type === 'SLEEP_CONFIRM' && d.typicalWakeHHMM) {
      const [wh, wm] = d.typicalWakeHHMM.split(':').map(Number);
      result.push({
        logicalKey: key,
        title: d.title ?? 'Good morning ☀️',
        body: d.body ?? "Confirm last night's sleep?",
        data: { type: 'SLEEP_CONFIRM', dest: 'Sleep', logicalKey: 'sleep_confirm', appTag: APP_TAG },
        trigger: { hour: wh ?? 7, minute: wm ?? 0, repeats: true } as any,
        channelId: d.channelId ?? 'reminder-chime',
        categoryIdentifier: 'SLEEP_REMINDER',
      });
      continue;
    }

    // HEALTH_TRIGGER: immediate
    if (d?.type === 'HEALTH_TRIGGER') {
      result.push({
        logicalKey: key,
        title: d.title ?? 'Mindfulness Suggestion',
        body: d.body ?? 'Take a moment to breathe.',
        data: {
          type: 'HEALTH_TRIGGER',
          reason: d.reason,
          intervention: d.intervention,
          url: d.url ?? `reclaim://mindfulness?intervention=${encodeURIComponent(d.intervention ?? '')}&autoStart=true`,
          appTag: APP_TAG,
        },
        trigger: null as any,
        channelId: 'mindfulness-health',
        categoryIdentifier: 'MOOD_REMINDER',
      });
      continue;
    }

    // TRAINING_REST: immediate
    if (d?.type === 'TRAINING_REST') {
      result.push({
        logicalKey: key,
        title: d.title ?? 'Rest started',
        body: d.body ?? 'Rest timer',
        data: {
          type: 'TRAINING_REST',
          sessionId: d.sessionId,
          exerciseId: d.exerciseId,
          setIndex: d.setIndex,
          appTag: APP_TAG,
        },
        trigger: null as any,
        channelId: 'reminder-chime',
        categoryIdentifier: 'TRAINING_REST',
      });
      continue;
    }

    // TRAINING_SET: interval
    if (d?.type === 'TRAINING_SET' && d.seconds !== undefined) {
      result.push({
        logicalKey: key,
        title: d.title ?? 'Rest complete',
        body: d.body ?? '',
        data: {
          type: 'TRAINING_SET',
          sessionId: d.sessionId,
          exerciseId: d.exerciseId,
          setIndex: d.setIndex,
          appTag: APP_TAG,
        },
        trigger: { seconds: Math.max(1, Math.floor(d.seconds)) } as any,
        channelId: 'reminder-chime',
        categoryIdentifier: 'TRAINING_SET',
      });
      continue;
    }

    // TRAINING_REMINDER snooze: date
    if (d?.type === 'TRAINING_REMINDER' && d.triggerDate) {
      result.push({
        logicalKey: key,
        title: d.title ?? 'Training Reminder',
        body: d.body ?? '',
        data: { ...d, appTag: APP_TAG },
        trigger: { date: new Date(d.triggerDate) } as any,
        channelId: d.channelId ?? 'default',
        categoryIdentifier: 'TRAINING_REMINDER',
      });
      continue;
    }
  }

  return result;
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
    const trigger = buildTriggerForSchedule(planned);
    const data = { ...planned.data, appTag: APP_TAG };
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: planned.title,
        body: planned.body,
        data,
        categoryIdentifier: planned.categoryIdentifier,
      },
      trigger,
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
 * Reconcile notifications: merge settings plan + intents, schedule via single path (Phase 5.2 cutover)
 */
export async function reconcileNotifications(): Promise<void> {
  try {
    logger.debug('[NOTIF_RECON] Starting reconciliation');

    const ok = await ensurePermissionsAndChannels();
    if (!ok) return;

    const settingsPlan = await buildNotificationPlan();
    const intentPlan = await buildPlanFromIntents();

    // Merge: settings first, then intents (intents override same logicalKey)
    const byKey = new Map<string, PlannedNotification>();
    for (const n of settingsPlan.notifications) {
      byKey.set(String(n.logicalKey), n);
    }
    for (const n of intentPlan) {
      byKey.set(String(n.logicalKey), n);
    }
    const merged = Array.from(byKey.values());

    const newFingerprint = computePlanFingerprint(merged);
    const lastFingerprint = await loadLastFingerprint();

    if (lastFingerprint === newFingerprint) {
      logger.debug('[NOTIF_RECON] Plan unchanged, skipping', {
        intent_count: intentPlan.length,
        scheduled_count: merged.length,
      });
      return;
    }

    // Cancel all app notifications (including pre-cutover ones without appTag)
    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of allScheduled) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
    if (__DEV__) {
      logger.debug(`[NotificationScheduler] Cancelled ${allScheduled.length} notifications`);
    }

    const addedKeys: string[] = [];
    let scheduledCount = 0;
    for (const planned of merged) {
      const id = await scheduleNotification(planned);
      if (id) {
        scheduledCount++;
        addedKeys.push(String(planned.logicalKey));
      }
    }

    await saveFingerprint(newFingerprint);

    logger.debug('[NOTIF_RECON] Reconciled', {
      intent_count: intentPlan.length,
      scheduled_count: scheduledCount,
      added_keys: addedKeys.slice(0, 20),
      removed_count: lastFingerprint ? allScheduled.length : 0,
    });

    logReconciliationEvent(scheduledCount).catch(() => {});
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
    const intents = await getIntents();

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
      intentCount: intents.length,
      intents: intents.map((i) => ({ logicalKey: i.logicalKey, createdAt: i.createdAt })),
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
