// Notification Scheduler - Idempotent, deterministic notification planning
import { Platform, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../logger';
import { supabase } from '../supabase';
import { getNotificationPreferences } from '../notificationPreferences';
import { getUserSettings } from '../userSettings';
import { loadSleepSettings } from '../sleepSettings';
import { getIntents, setIntent, type NotificationIntent } from './NotificationIntentStore';
import {
  mergedPlanSatisfiesNativeScheduledPresence,
  plannedNotificationExpectsNativeScheduledEntry,
} from './notificationPlanTrigger';

const PLAN_FINGERPRINT_KEY = '@reclaim/notifications/planFingerprint';
const PLAN_LAST_SCHEDULED_KEY = '@reclaim/notifications/lastScheduled';
const APP_TAG = 'reclaim';
const IS_ANDROID = Platform.OS === 'android';

// Notification display handler is registered once in App.tsx (the app entry point).
// Do NOT add a duplicate setNotificationHandler here — Expo uses the last registration,
// and having two call sites creates a maintenance trap if configs diverge.

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
  /** Stable identifier so new notifications replace previous (e.g. reclaim-training-current) */
  identifier?: string;
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

  // Weekly trigger: { weekday, hour, minute, repeats } (refill reminders)
  if (t.weekday !== undefined && t.hour !== undefined && t.minute !== undefined) {
    return { type: typeCalendar, weekday: t.weekday, hour: t.hour, minute: t.minute, repeats: t.repeats ?? true, channelId } as Notifications.NotificationTriggerInput;
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

/**
 * Ensures all Reclaim notification channels exist on Android.
 * Uses Wear OS–appropriate config: lockscreenVisibility PUBLIC, HIGH importance for actionable types.
 * Single source of truth for: default, training, reminder-chime, reminder-silent, mindfulness-health, meditation.
 * Safe to call repeatedly; no-op on iOS.
 */
export async function ensureReclaimChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    // default: training, general (actionable on watch)
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [100, 200, 100],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    // reminder-silent: user disabled chime
    await Notifications.setNotificationChannelAsync('reminder-silent', {
      name: 'Reclaim Reminders (Silent)',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: undefined,
      vibrationPattern: [0, 150],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    // reminder-chime: meds, mood, sleep, refill (actionable)
    await Notifications.setNotificationChannelAsync('reminder-chime', {
      name: 'Reclaim Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [100, 200, 100],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    // training: dedicated channel for training notifications (REST, SET, REMINDER)
    // Separate from 'default' so users can control training alerts independently on watch/phone.
    await Notifications.setNotificationChannelAsync('training', {
      name: 'Training',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    // mindfulness-health: health-triggered mindfulness (actionable)
    await Notifications.setNotificationChannelAsync('mindfulness-health', {
      name: 'Mindfulness (Health Triggers)',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [100, 200, 100],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    // meditation: alarm-like (exact time, force sound) for sound-guided sessions
    await Notifications.setNotificationChannelAsync('meditation', {
      name: 'Meditation',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [200, 300, 200],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      enableVibrate: true,
    });
  } catch (e) {
    logger.warn('[NotificationScheduler] Failed to ensure Reclaim channels', e);
  }
}

/**
 * Read notification permission without prompting. User-facing flows should call
 * `ensureNotificationPermission` before relying on scheduled notifications.
 * Android channels are still ensured whenever possible so cancellation paths behave.
 */
async function ensurePermissionsAndChannels(): Promise<boolean> {
  try {
    const perm = await Notifications.getPermissionsAsync();

    const granted =
      perm.granted ||
      perm.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
      perm.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED;

    await ensureReclaimChannels();

    if (!granted) {
      logger.warn('[NotificationScheduler] Notifications permission not granted (read-only check)');
    }

    return granted;
  } catch (e) {
    logger.warn('[NotificationScheduler] Failed to ensure permissions/channels', e);
    try {
      await ensureReclaimChannels();
    } catch {
      // ignore
    }
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

    // Mood reminder: ONE per day at the user-chosen time (default 20:00),
    // skipped when today's mood is already logged. Scheduled as one-shot date
    // triggers for the next few days so a logged day never re-fires.
    const moodRemindersEnabled = prefs.moodRemindersEnabled !== false;

    if (moodRemindersEnabled) {
      const [mh, mm] = (prefs.moodReminderHHMM ?? '20:00').split(':').map((n) => parseInt(n, 10));
      const hour = Number.isFinite(mh) ? mh : 20;
      const minute = Number.isFinite(mm) ? mm : 0;

      let loggedToday = false;
      try {
        const { hasMoodCheckinToday } = await import('@/lib/mood/moodService');
        loggedToday = await hasMoodCheckinToday();
      } catch {
        // Unknown → keep today's reminder (better a reminder than silence)
      }

      const now = new Date();
      for (let offset = 0; offset < 3; offset++) {
        const when = new Date(now);
        when.setDate(when.getDate() + offset);
        when.setHours(hour, minute, 0, 0);
        if (when.getTime() <= now.getTime()) continue; // time already passed
        if (offset === 0 && loggedToday) continue; // already logged today
        const dayKey = `${when.getFullYear()}-${(when.getMonth() + 1).toString().padStart(2, '0')}-${when
          .getDate()
          .toString()
          .padStart(2, '0')}`;
        notifications.push({
          logicalKey: `mood_daily:${dayKey}`,
          title: 'Evening check-in',
          body: 'How was your day? Tap to log.',
          data: { type: 'MOOD_REMINDER', dest: 'Mood', logicalKey: `mood_daily:${dayKey}`, appTag: APP_TAG },
          trigger: { date: when } as any,
          channelId: reminderChannelId,
          categoryIdentifier: 'MOOD_REMINDER',
        });
      }
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
        title: 'Good morning',
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
    // Absolute-timestamp intents: fingerprint on the fixed fire time, not the
    // live seconds-until value (which shrinks every reconcile pass).
    const scheduledAt = (n.data as any)?.scheduledAt;
    if (scheduledAt && t?.seconds !== undefined) return `${key}:at:${scheduledAt}`;
    if (t?.date) return `${key}:date:${t.date}`;
    if (t?.seconds !== undefined) return `${key}:interval:${t.seconds}`;
    if (t === null || t === undefined) return `${key}:immediate`;
    if (t?.weekday !== undefined) return `${key}:weekday:${t.weekday}:${t.hour ?? 0}:${t.minute ?? 0}`;
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
      const data = { type: 'MED_REMINDER', medId: d.medId, scheduledFor: d.scheduledFor, logicalKey: key, appTag: APP_TAG };
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

    // MOOD_REMINDER intents: legacy fixed-time repeating reminders (mood_morning /
    // mood_evening) are retired — the daily reminder comes from the settings plan
    // (one per day at the user-chosen time, skipped when already logged).
    if (d?.type === 'MOOD_REMINDER') {
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
        title: d.title ?? 'Good morning',
        body: d.body ?? "Confirm last night's sleep?",
        data: { type: 'SLEEP_CONFIRM', dest: 'Sleep', logicalKey: 'sleep_confirm', appTag: APP_TAG },
        trigger: { hour: wh ?? 7, minute: wm ?? 0, repeats: true } as any,
        channelId: d.channelId ?? 'reminder-chime',
        categoryIdentifier: 'SLEEP_REMINDER',
      });
      continue;
    }

    // HEALTH_TRIGGER: immediate or snooze (triggerDate)
    if (d?.type === 'HEALTH_TRIGGER') {
      const healthData = {
        type: 'HEALTH_TRIGGER',
        reason: d.reason,
        intervention: d.intervention,
        url: d.url ?? `reclaim://mindfulness?intervention=${encodeURIComponent(d.intervention ?? '')}&autoStart=true`,
        appTag: APP_TAG,
      };
      if (d.triggerDate) {
        result.push({
          logicalKey: key,
          title: d.title ?? 'Mindfulness Suggestion',
          body: d.body ?? 'Take a moment to breathe.',
          data: healthData,
          trigger: { date: new Date(d.triggerDate) } as any,
          channelId: d.channelId ?? 'mindfulness-health',
          categoryIdentifier: 'MINDFULNESS_REMINDER',
        });
      } else {
        result.push({
          logicalKey: key,
          title: d.title ?? 'Mindfulness Suggestion',
          body: d.body ?? 'Take a moment to breathe.',
          data: healthData,
          trigger: null as any,
          channelId: 'mindfulness-health',
          categoryIdentifier: 'MINDFULNESS_REMINDER',
        });
      }
      continue;
    }

    // TRAINING_SET / TRAINING_REST: dumb triggers. Payload is sessionId + action-verb
    // context + display strings only — handlers derive work from the DB at fire time.
    // One OS notification identifier per session (updated in place).
    if (d?.type === 'TRAINING_REST' || d?.type === 'TRAINING_SET') {
      // Legacy chained-payload intents (pre dumb-trigger pipeline) are dropped:
      // they carry per-set keys and stale lookahead we no longer materialize.
      if (key.startsWith('training_rest:') || key.startsWith('training_set:') || key.startsWith('training_first:')) {
        continue;
      }
      const promptData: Record<string, any> = {
        type: d.type,
        sessionId: d.sessionId,
        issuedAt: d.issuedAt,
        appTag: APP_TAG,
      };
      if (d.chronometerCountDown === true && d.chronometerBaseTime != null) {
        promptData.chronometerCountDown = true;
        promptData.chronometerBaseTime = d.chronometerBaseTime;
      }
      const identifier = `reclaim-training-${d.sessionId}`;
      if (d.scheduledAt) {
        // Timed prompt: absolute timestamp. Never re-materialize once passed.
        const secUntil = Math.floor((new Date(d.scheduledAt as string).getTime() - Date.now()) / 1000);
        if (secUntil <= 0) continue;
        promptData.scheduledAt = d.scheduledAt;
        result.push({
          logicalKey: key,
          title: d.title ?? 'Training',
          body: d.body ?? '',
          data: promptData,
          trigger: { type: typeTimeInterval, seconds: Math.max(1, secUntil), repeats: false, channelId: 'training' } as any,
          channelId: 'training',
          categoryIdentifier: d.type,
          identifier,
        });
        continue;
      }
      // Immediate prompt: firedAt guard — once presented, never re-materialized.
      if (d.firedAt) continue;
      result.push({
        logicalKey: key,
        title: d.title ?? 'Training',
        body: d.body ?? '',
        data: promptData,
        trigger: null as any,
        channelId: 'training',
        categoryIdentifier: d.type,
        identifier,
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
        channelId: d.channelId ?? 'training',
        categoryIdentifier: 'TRAINING_REMINDER',
      });
      continue;
    }

    // MED_REFILL: weekly per-med reminder (refill check)
    if (d?.type === 'MED_REFILL' && d.medId && d.weekday != null && d.hour != null && d.minute != null) {
      result.push({
        logicalKey: key,
        title: d.title ?? 'Medication refill check',
        body: d.body ?? '',
        data: { type: 'MED_REFILL', medId: d.medId, dest: 'Meds', appTag: APP_TAG },
        trigger: { weekday: d.weekday, hour: d.hour, minute: d.minute, repeats: true } as any,
        channelId: d.channelId ?? 'reminder-chime',
      });
      continue;
    }

    // MEDITATION_FIXED: daily at fixed time
    if (d?.type === 'MEDITATION_FIXED' && d.hour != null && d.minute != null && d.url) {
      result.push({
        logicalKey: key,
        title: d.title ?? 'Meditation',
        body: d.body ?? '',
        data: { url: d.url, appTag: APP_TAG },
        trigger: { hour: d.hour, minute: d.minute, repeats: true } as any,
        channelId: 'meditation',
      });
      continue;
    }

    // MEDITATION_AFTER_WAKE: one-shot at computed time (recomputed each reconcile)
    if (d?.type === 'MEDITATION_AFTER_WAKE' && d.offsetMinutes != null && d.url) {
      const { getLatestWakeTime } = await import('@/lib/health/getLatestWakeTime');
      const wakeResult = await getLatestWakeTime();
      let when: Date;
      if (wakeResult) {
        when = new Date(wakeResult.wakeTime.getTime() + d.offsetMinutes * 60 * 1000);
      } else {
        const fallbackHour = d.fallbackHour ?? 8;
        const fallbackMinute = d.fallbackMinute ?? 0;
        when = new Date();
        when.setHours(fallbackHour, fallbackMinute, 0, 0);
        if (when <= new Date()) when.setDate(when.getDate() + 1);
      }
      if (when <= new Date()) continue; // skip if past
      result.push({
        logicalKey: key,
        title: d.title ?? 'After-wake meditation',
        body: d.body ?? '',
        data: { url: d.url, appTag: APP_TAG },
        trigger: { date: when } as any,
        channelId: 'meditation',
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
  const key = String(planned.logicalKey);
  const attempt = async (): Promise<string> => {
    const trigger = buildTriggerForSchedule(planned);
    const planSignature = planSignatureForNotification(planned);
    const data = {
      ...planned.data,
      appTag: APP_TAG,
      logicalKey: key,
      planSignature,
    };
    const channelId = planned.channelId ?? 'default';
    const request: Notifications.NotificationRequestInput = {
      content: {
        title: planned.title,
        body: planned.body,
        data,
        categoryIdentifier: planned.categoryIdentifier,
        ...(IS_ANDROID && { channelId }),
      },
      trigger,
    };
    if (planned.identifier) {
      (request as any).identifier = planned.identifier;
    }
    return await Notifications.scheduleNotificationAsync(request);
  };

  try {
    const identifier = await attempt();
    if (String(key).includes('training_')) {
      logger.debug('[GUIDED_NATIVE_SCHEDULE]', { logicalKey: key, nativeNotificationId: identifier });
    } else if (__DEV__) {
      logger.debug(`[NotificationScheduler] Scheduled ${key}: ${identifier}`);
    }
    return identifier;
  } catch (error: any) {
    // Retry once for med_refill on transient failures (e.g. platform limits, race)
    if (key.startsWith('med_refill:')) {
      try {
        await new Promise((r) => setTimeout(r, 500));
        const identifier = await attempt();
        if (__DEV__) logger.debug(`[NotificationScheduler] Scheduled ${key} (retry): ${identifier}`);
        return identifier;
      } catch (retryError: any) {
        const medId = planned.data?.medId;
        const details = medId ? { medId, message: retryError?.message ?? String(retryError) } : retryError;
        logger.warn(`[NotificationScheduler] Failed to schedule ${key} (after retry):`, details);
        return null;
      }
    }
    const medId = planned.data?.medId;
    const details = medId ? { medId, message: error?.message ?? String(error) } : error;
    logger.warn(`[NotificationScheduler] Failed to schedule ${key}:`, details);
    return null;
  }
}

function planSignatureForNotification(planned: PlannedNotification): string {
  const t = planned.trigger as any;
  const scheduledAt = (planned.data as any)?.scheduledAt;
  let triggerSig = 'unknown';
  if (t === null || t === undefined) triggerSig = 'immediate';
  else if (scheduledAt && t?.seconds !== undefined) triggerSig = `at:${scheduledAt}`;
  else if (t?.date) triggerSig = `date:${new Date(t.date).toISOString()}`;
  else if (t?.seconds !== undefined) triggerSig = `seconds:${Math.max(1, Math.floor(t.seconds))}:${!!t?.repeats}`;
  else if (t?.weekday !== undefined)
    triggerSig = `weekday:${t.weekday}:${t.hour ?? 0}:${t.minute ?? 0}:${!!t?.repeats}`;
  else triggerSig = `time:${t?.hour ?? 0}:${t?.minute ?? 0}:${!!t?.repeats}`;

  return [
    String(planned.logicalKey),
    planned.title,
    planned.body,
    triggerSig,
    planned.channelId ?? '',
    planned.categoryIdentifier ?? '',
  ].join('|');
}

let reconciling = false;
let rerunAfterCurrent = false;
const RECON_DEBOUNCE_MS = 250;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let debounceResolvers: Array<() => void> = [];

async function runReconcileImmediate(): Promise<void> {
  if (reconciling) {
    // Don't silently drop — flag for a follow-up run once current finishes
    rerunAfterCurrent = true;
    return;
  }
  reconciling = true;
  rerunAfterCurrent = false;
  try {
    logger.debug('[NOTIF_RECON] Starting reconciliation');

    const permOk = await ensurePermissionsAndChannels();

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

    const trainingIntentEntries = merged.filter((n) => String(n.logicalKey).includes('training_'));
    if (trainingIntentEntries.length > 0) {
      logger.debug('[GUIDED_RECONCILE] merged training intents', {
        count: trainingIntentEntries.length,
        keys: trainingIntentEntries.map((n) => n.logicalKey).slice(0, 12),
        appState: AppState.currentState,
      });
    }

    const newFingerprint = computePlanFingerprint(merged);
    const lastFingerprint = await loadLastFingerprint();

    const appNotifs = await getAppScheduledNotifications();
    if (lastFingerprint === newFingerprint) {
      const scheduledKeys = new Set(
        appNotifs
          .map((n) => {
            const data = n.content.data as any;
            return typeof data?.logicalKey === 'string' ? data.logicalKey : null;
          })
          .filter((k): k is string => !!k),
      );
      const allKeysPresent = mergedPlanSatisfiesNativeScheduledPresence(merged, scheduledKeys);
      if (allKeysPresent) {
        logger.debug('[NOTIF_RECON] Plan unchanged, all keys present, skipping', {
          intent_count: intentPlan.length,
          scheduled_count: merged.length,
        });
        return;
      }
      logger.debug('[NOTIF_RECON] Fingerprint matches but keys missing (e.g. system cleared), rescheduling', {
        intent_count: intentPlan.length,
        merged_count: merged.length,
        missing_keys: merged
          .filter((n) => plannedNotificationExpectsNativeScheduledEntry(n) && !scheduledKeys.has(String(n.logicalKey)))
          .map((n) => n.logicalKey),
      });
    }

    const desiredByKey = new Map<string, PlannedNotification>();
    for (const planned of merged) {
      desiredByKey.set(String(planned.logicalKey), planned);
    }

    const existingByKey = new Map<string, Notifications.NotificationRequest[]>();
    for (const existing of appNotifs) {
      const key = String((existing.content.data as any)?.logicalKey ?? '');
      if (!key) {
        await Notifications.cancelScheduledNotificationAsync(existing.identifier);
        continue;
      }
      const bucket = existingByKey.get(key) ?? [];
      bucket.push(existing);
      existingByKey.set(key, bucket);
    }

    const keysToSchedule = new Set<string>();
    let removedCount = 0;

    for (const [key, existing] of existingByKey.entries()) {
      const planned = desiredByKey.get(key);
      if (!planned) {
        for (const e of existing) {
          await Notifications.cancelScheduledNotificationAsync(e.identifier);
          removedCount += 1;
        }
        continue;
      }

      const expectedSignature = planSignatureForNotification(planned);
      const matching = existing.find(
        (e) => (e.content.data as any)?.planSignature === expectedSignature,
      );
      if (matching) {
        for (const e of existing) {
          if (e.identifier === matching.identifier) continue;
          await Notifications.cancelScheduledNotificationAsync(e.identifier);
          removedCount += 1;
        }
      } else {
        for (const e of existing) {
          await Notifications.cancelScheduledNotificationAsync(e.identifier);
          removedCount += 1;
        }
        keysToSchedule.add(key);
      }
    }

    for (const key of desiredByKey.keys()) {
      if (!existingByKey.has(key)) keysToSchedule.add(key);
    }

    const addedKeys: string[] = [];
    let scheduledCount = 0;
    for (const key of keysToSchedule) {
      const planned = desiredByKey.get(key);
      if (!planned) continue;
      if (!permOk) {
        if (__DEV__) {
          logger.debug('[NOTIF_RECON] Skip schedule (no notification permission)', { key });
        }
        continue;
      }
      const id = await scheduleNotification(planned);
      if (id) {
        scheduledCount++;
        addedKeys.push(String(planned.logicalKey));
        // firedAt write-back: mark immediate training prompts so they are not re-scheduled
        // on subsequent reconcile passes. The firedAt guard in buildPlanFromIntents skips them.
        const plannedData = planned.data as Record<string, any> | undefined;
        if (
          (plannedData?.type === 'TRAINING_REST' || plannedData?.type === 'TRAINING_SET') &&
          planned.trigger === null &&
          !plannedData?.scheduledAt
        ) {
          const intentKey = String(planned.logicalKey);
          setIntent(intentKey, { ...plannedData, firedAt: new Date().toISOString() }).catch((e) => {
            if (__DEV__) logger.debug('[NOTIF_RECON] firedAt write-back failed', { key: intentKey, error: e });
          });
          if (__DEV__) {
            logger.debug('[RECONCILER_IMMEDIATE_FIRE]', {
              intentKey,
              isReFire: false,
              firedAt: new Date().toISOString(),
            });
          }
        }
      }
    }

    await saveFingerprint(newFingerprint);

    logger.debug('[NOTIF_RECON] Reconciled', {
      intent_count: intentPlan.length,
      scheduled_count: desiredByKey.size,
      added_keys: addedKeys.slice(0, 20),
      removed_count: removedCount,
    });

    logReconciliationEvent(desiredByKey.size).catch((e) => { if (__DEV__) logger.debug('[NotificationScheduler]', e); });
  } catch (error) {
    logger.error('[NotificationScheduler] Failed to reconcile notifications:', error);
  } finally {
    reconciling = false;
    if (rerunAfterCurrent) {
      rerunAfterCurrent = false;
      // A second batch of intents arrived while we were running — process them now
      runReconcileImmediate().catch((e) => { if (__DEV__) logger.debug('[NotificationScheduler]', e); });
    }
  }
}

/**
 * Reconcile notifications: merge settings plan + intents, schedule via single path (Phase 5.2 cutover)
 * Uses mutex to prevent concurrent runs. Debounces rapid successive calls (Phase 3).
 */
export async function reconcileNotifications(): Promise<void> {
  return new Promise((resolve) => {
    debounceResolvers.push(resolve);
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    debounceTimer = setTimeout(async () => {
      debounceTimer = null;
      try {
        await runReconcileImmediate();
      } catch {
        // runReconcileImmediate already handles/logs internal errors.
      } finally {
        const pending = debounceResolvers;
        debounceResolvers = [];
        for (const done of pending) done();
      }
    }, RECON_DEBOUNCE_MS);
  });
}

/**
 * Force re-schedule all notifications (for settings changes).
 * Runs immediately (no debounce) since user explicitly requested.
 */
export async function forceRescheduleNotifications(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PLAN_FINGERPRINT_KEY);
    await runReconcileImmediate();
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
