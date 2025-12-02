// C:\Reclaim\app\src\hooks\useNotifications.ts
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useEffect } from 'react';
import { logMedDose } from '@/lib/api';
import { navigateToMeds, navigateToMood, navigateToSleep } from '@/navigation/nav';
import { logger } from '@/lib/logger';
import { applyQuietHours, getNotificationPreferences } from '@/lib/notificationPreferences';
import { getUserSettings } from '@/lib/userSettings';

// --- DEBUG HELPERS ---
// Removed debugToast - no longer sending debug notifications
function d(...args: any[]) { logger.debug('[NOTIFS]', ...args); }

type MedReminderData = {
  type: 'MED_REMINDER';
  medId: string;
  doseTimeISO: string;
  medName?: string;
  doseLabel?: string;
};

type MoodReminderData = { type: 'MOOD_REMINDER' };

// Sleep payload type (we use .type strings to route)
type SleepReminderData = { type: 'SLEEP_CONFIRM' | 'SLEEP_BEDTIME' };

// --- Permission helpers ---
export async function ensureNotificationPermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.status === 'granted';
}

/**
 * Exported helper for onboarding:
 * import { useNotifications, requestPermission } from '@/hooks/useNotifications'
 */
export async function requestPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/** ---------- Trigger helpers (version-proof) ---------- */
function intervalTrigger(
  seconds: number,
  repeats = false,
  channelId = 'default'
): Notifications.TimeIntervalTriggerInput {
  const typeEnum =
    // @ts-ignore – older SDKs
    (Notifications as any).SchedulableTriggerInputTypes?.TIME_INTERVAL ?? 'timeInterval';
  const base = { seconds: Math.max(1, Math.floor(seconds)), repeats, channelId };
  return ({ type: typeEnum, ...base } as unknown) as Notifications.TimeIntervalTriggerInput;
}

function calendarTrigger(
  date: Date,
  channelId = 'default'
): Notifications.CalendarTriggerInput {
  const typeEnum =
    // @ts-ignore – older SDKs
    (Notifications as any).SchedulableTriggerInputTypes?.CALENDAR ?? 'calendar';
  const base = { date, channelId };
  return ({ type: typeEnum, ...base } as unknown) as Notifications.CalendarTriggerInput;
}

function secondsUntil(when: Date) {
  return Math.max(1, Math.floor((when.getTime() - Date.now()) / 1000));
}
/** ----------------------------------------------------- */

type ReminderChannelConfig = {
  channelId: string;
  sound?: Notifications.NotificationContent['sound'];
};

async function getReminderChannelConfig(): Promise<ReminderChannelConfig> {
  const settings = await getUserSettings();
  const enabled = settings.notificationChimeEnabled ?? true;
  const channelId = enabled ? 'reminder-chime' : 'reminder-silent';
  const sound: Notifications.NotificationContent['sound'] | undefined = enabled ? 'default' : undefined;
  return { channelId, sound };
}

// De-dupe: is a med+time already scheduled?
export async function isAlreadyScheduled(medId: string, doseTimeISO: string) {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  return all.some((req) => {
    const d = req.content?.data as any;
    return d?.type === 'MED_REMINDER' && d?.medId === medId && d?.doseTimeISO === doseTimeISO;
  });
}

// Cancel all reminders for a specific med
export async function cancelRemindersForMed(medId: string) {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  const matches = all.filter((req) => {
    const d = req.content?.data as any;
    return d?.type === 'MED_REMINDER' && d?.medId === medId;
  });
  for (const m of matches) {
    await Notifications.cancelScheduledNotificationAsync(m.identifier);
  }
}

/** ========= PROCESS RESPONSES (tap/actions) ========= */
const handledResponseIds = new Set<string>();

async function processNotificationResponse(
  response: Notifications.NotificationResponse
) {
  const key = response.notification.request.identifier + '::' + response.actionIdentifier;
  if (handledResponseIds.has(key)) return;
  handledResponseIds.add(key);

  const action = response.actionIdentifier;
  const data = response.notification.request.content.data as
    | MedReminderData
    | MoodReminderData
    | SleepReminderData
    | (Record<string, any> & { url?: string; dest?: string })
    | undefined;

  d('notif response', { action, data });

  // BODY TAP → open deep-link first (if provided), else route by type/dest
  if (action === Notifications.DEFAULT_ACTION_IDENTIFIER) {
    const rawData = response.notification.request.content.data as any;
    const url: string | undefined = rawData?.url;

    if (url) {
      await Linking.openURL(url);
      return;
    }

    // Meds
    if ((data as any)?.type === 'MED_REMINDER') {
      navigateToMeds((data as MedReminderData).medId);
      return;
    }

    // Mood
    if ((data as any)?.type === 'MOOD_REMINDER') {
      navigateToMood();
      return;
    }

    // Sleep
    if ((data as any)?.type === 'SLEEP_CONFIRM' || (data as any)?.type === 'SLEEP_BEDTIME') {
      navigateToSleep();
      return;
    }

    // Fallback: generic destination key
    const dest = rawData?.dest;
    if (dest === 'Mood') { navigateToMood(); return; }
    if (dest === 'Sleep') { navigateToSleep(); return; }
  }

  // ACTION BUTTONS (Taken / Snooze 10m) — meds only
  if (!data || (data as any).type !== 'MED_REMINDER') return;
  await handleMedReminderAction(action, data as MedReminderData, response);
}
/** ==================================================== */

export function useNotifications() {
  useEffect(() => {
    (async () => {
      const granted = await ensureNotificationPermission();
      if (!granted) logger.warn('Notification permission not granted');

      // Android channels
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [100, 200, 100],
        sound: 'default',
      });
      await Notifications.setNotificationChannelAsync('reminder-chime', {
        name: 'Reclaim Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [100, 200, 100],
      });
      await Notifications.setNotificationChannelAsync('reminder-silent', {
        name: 'Reclaim Reminders (Silent)',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#e0f2fe',
        enableVibrate: false,
        sound: undefined,
      });
      await Notifications.setNotificationChannelAsync('meditation', {
        name: 'Meditation',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
      });

      // Med action buttons (do not foreground app)
      await Notifications.setNotificationCategoryAsync('MED_REMINDER', [
        { identifier: 'TAKE',      buttonTitle: 'Taken',      options: { opensAppToForeground: false } },
        { identifier: 'SNOOZE_10', buttonTitle: 'Snooze 10m', options: { opensAppToForeground: false } },
        { identifier: 'SKIP',      buttonTitle: 'Skip',       options: { opensAppToForeground: false } },
      ]);
      
      // Cleanup past notifications on app start
      await cleanupPastNotifications();

      await Notifications.setNotificationCategoryAsync('MOOD_REMINDER', []);
      // Sleep confirm category (no actions yet)
      await Notifications.setNotificationCategoryAsync('SLEEP_REMINDER', []);
    })();

    const sub = Notifications.addNotificationResponseReceivedListener(async (response) => {
      try {
        await processNotificationResponse(response);
      } catch (err) {
        logger.warn('Notification action handling failed:', err);
      }
    });

    (async () => {
      try {
        const initial = await Notifications.getLastNotificationResponseAsync();
        if (initial) await processNotificationResponse(initial);
      } catch (err) {
        logger.warn('Failed to process initial notification response:', err);
      }
    })();

    return () => {
      sub.remove();
    };
  }, []);
}

/**
 * Clean up past-due notifications (older than 24 hours)
 * This prevents notification backlog from accumulating
 */
export async function cleanupPastNotifications() {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    for (const notif of all) {
      const trigger = notif.trigger as any;
      let notificationTime: number | null = null;
      
      // Extract notification time based on trigger type
      if (trigger?.date) {
        notificationTime = new Date(trigger.date).getTime();
      } else if (trigger?.seconds) {
        notificationTime = now + (trigger.seconds * 1000);
      } else if (trigger?.hour !== undefined && trigger?.minute !== undefined) {
        // Calendar trigger - check if it's in the past for non-repeating
        if (!trigger.repeats) {
          const triggerDate = new Date();
          triggerDate.setHours(trigger.hour, trigger.minute, 0, 0);
          if (triggerDate.getTime() < now) {
            notificationTime = triggerDate.getTime();
          }
        }
      }
      
      // Cancel notifications that are past due (more than 24 hours old) and non-repeating
      if (notificationTime && notificationTime < oneDayAgo && !trigger?.repeats) {
        const data = notif.content?.data as any;
        // Only cancel medication reminders that are past due
        if (data?.type === 'MED_REMINDER') {
          await Notifications.cancelScheduledNotificationAsync(notif.identifier);
          d('Cleaned up past notification', notif.identifier);
        }
      }
    }
  } catch (error) {
    logger.warn('Failed to cleanup past notifications:', error);
  }
}

/**
 * Actionable med reminder (Taken / Snooze 10m / Skip).
 */
export async function scheduleMedReminderActionable(params: {
  medId: string;
  medName: string;
  doseTimeISO: string;
  doseLabel?: string;
  title?: string;
  body?: string;
}) {
  const granted = await ensureNotificationPermission();
  if (granted === false) throw new Error('Notifications are disabled');

  const { medId, medName, doseTimeISO, doseLabel, title, body } = params;
  const when = new Date(doseTimeISO);
  
  // Don't schedule notifications in the past (more than 1 hour ago)
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  if (when.getTime() < oneHourAgo) {
    d('Skipping past notification', { medId, doseTimeISO });
    return null;
  }
  
  const prefs = await getNotificationPreferences();
  let scheduledFor = applyQuietHours(when, prefs);
  // Ensure notification is at least 1 second in the future
  if (scheduledFor.getTime() <= Date.now()) {
    scheduledFor = new Date(Math.max(Date.now() + 1000, scheduledFor.getTime()));
  }
  const { channelId, sound } = await getReminderChannelConfig();
  const content: Notifications.NotificationContentInput = {
    title: title ?? `Time to take ${medName}`,
    body: body ?? (doseLabel ? `${medName} — ${doseLabel}` : medName),
    categoryIdentifier: 'MED_REMINDER',
    data: {
      type: 'MED_REMINDER',
      medId,
      medName,
      doseTimeISO,
      doseLabel,
    } as MedReminderData,
    ...(sound ? { sound } : {}),
  };
  const inExpoGoOnAndroid =
    Platform.OS === 'android' && Constants.appOwnership === 'expo';

  if (inExpoGoOnAndroid) {
    if (await isAlreadyScheduled(medId, doseTimeISO)) return;
    return Notifications.scheduleNotificationAsync({
      content,
      trigger: intervalTrigger(secondsUntil(scheduledFor), false, channelId),
    });
  }

  if (await isAlreadyScheduled(medId, doseTimeISO)) return;
  return Notifications.scheduleNotificationAsync({
    content,
    trigger: calendarTrigger(scheduledFor, channelId),
  });
}

export async function cancelAllReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/** ===== MOOD: Daily repeating reminders (08:00 & 20:00) ===== */
export async function scheduleMoodCheckinReminders() {
  const granted = await ensureNotificationPermission();
  if (!granted) throw new Error('Notifications permission not granted');

  await cancelMoodCheckinReminders();
  const { channelId, sound } = await getReminderChannelConfig();

  const times = [
    { hour: 8, minute: 0, title: 'Morning check-in', body: 'How are you feeling? Tap to log.' },
    { hour: 20, minute: 0, title: 'Evening check-in', body: 'Take a moment to reflect. Tap to log.' },
  ];

  for (const t of times) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: t.title,
        body: t.body,
        categoryIdentifier: 'MOOD_REMINDER',
        data: { type: 'MOOD_REMINDER' } as MoodReminderData,
        ...(sound ? { sound } : {}),
      },
      trigger: {
        hour: t.hour,
        minute: t.minute,
        repeats: true,
        channelId,
      } as any,
    });
  }
}

export async function cancelMoodCheckinReminders() {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  const matches = all.filter((req) => {
    const d = req.content?.data as any;
    return d?.type === 'MOOD_REMINDER';
  });
  for (const m of matches) {
    await Notifications.cancelScheduledNotificationAsync(m.identifier);
  }
}

/** ===== SLEEP: Bedtime & Morning confirm ===== */
export async function scheduleBedtimeSuggestion(typicalWakeHHMM: string, targetMinutes = 480) {
  const [wh, wm] = typicalWakeHHMM.split(':').map(Number);
  const suggest = new Date(); suggest.setHours(wh ?? 7, wm ?? 0, 0, 0);
  suggest.setMinutes(suggest.getMinutes() - (targetMinutes + 60));
  const { channelId, sound } = await getReminderChannelConfig();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Wind down?',
      body: 'Aim for your target sleep tonight.',
      data: { type: 'SLEEP_BEDTIME' } as SleepReminderData,
      categoryIdentifier: 'SLEEP_REMINDER',
      ...(sound ? { sound } : {}),
    },
    trigger: { hour: suggest.getHours(), minute: suggest.getMinutes(), repeats: true, channelId } as any,
  });
}

export async function scheduleMorningConfirm(typicalWakeHHMM: string) {
  const [wh, wm] = typicalWakeHHMM.split(':').map(Number);
  const { channelId, sound } = await getReminderChannelConfig();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Good morning ☀️',
      body: 'Confirm last night’s sleep?',
      data: { type: 'SLEEP_CONFIRM' } as SleepReminderData,
      categoryIdentifier: 'SLEEP_REMINDER',
      ...(sound ? { sound } : {}),
    },
    trigger: { hour: wh ?? 7, minute: wm ?? 0, repeats: true, channelId } as any,
  });
}

/** ===== INTERNAL: Med action handler ===== */
async function handleMedReminderAction(
  action: string,
  data: MedReminderData,
  response: Notifications.NotificationResponse
) {
  const nowIso = new Date().toISOString();

  if (action === 'TAKE') {
    d('TAKE logging', data);
    await logMedDose({
      med_id: data.medId,
      status: 'taken',
      taken_at: nowIso,
      scheduled_for: data.doseTimeISO,
    });
    return;
  }

  if (action === 'SNOOZE_10') {
    d('SNOOZE scheduling +10m', data);
    const prefs = await getNotificationPreferences();
    const snoozeMinutes = Math.max(1, prefs.snoozeMinutes);
    const snoozeTarget = new Date(Date.now() + snoozeMinutes * 60 * 1000);
    let scheduledFor = applyQuietHours(snoozeTarget, prefs);
    if (scheduledFor.getTime() <= Date.now()) {
      scheduledFor = new Date(Date.now() + snoozeMinutes * 60 * 1000);
    }
    const inExpoGoOnAndroid =
      Platform.OS === 'android' && Constants.appOwnership === 'expo';
    const { channelId, sound } = await getReminderChannelConfig();
    const snoozeContent: Notifications.NotificationContentInput = {
      title: 'Medication Reminder (Snoozed)',
      body: response.notification.request.content.body ?? 'Time to take your medication.',
      data,
      categoryIdentifier: 'MED_REMINDER',
      ...(sound ? { sound } : {}),
    };
    if (inExpoGoOnAndroid) {
      await Notifications.scheduleNotificationAsync({
        content: snoozeContent,
        trigger: intervalTrigger(secondsUntil(scheduledFor), false, channelId),
      });
    } else {
      await Notifications.scheduleNotificationAsync({
        content: snoozeContent,
        trigger: calendarTrigger(scheduledFor, channelId),
      });
    }
    return;
  }

  if (action === 'SKIP') {
    d('SKIP logging', data);
    await logMedDose({
      med_id: data.medId,
      status: 'skipped',
      scheduled_for: data.doseTimeISO,
    });
    return;
  }
}
