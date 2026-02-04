import { listMeds, type Med } from '@/lib/api';
import { getUserSettings } from '@/lib/userSettings';
import { setIntent, clearIntentsByPrefix } from '@/lib/notifications/NotificationIntentStore';
import { reconcileNotifications } from '@/lib/notifications/NotificationScheduler';
import * as Notifications from 'expo-notifications';
import { logger } from '@/lib/logger';

const REFILL_INTENT_PREFIX = 'med_refill:';

function resolveReminderSchedule(med: Med): { weekday: number; hour: number; minute: number } | null {
  const schedule = med.schedule;
  if (!schedule?.days?.length || !schedule.times?.length) return null;
  const day = Math.min(...schedule.days);
  const expoWeekday = day === 7 ? 1 : day + 1; // Meds: 1=Mon..7=Sun ↔ Expo: 1=Sun..7=Sat
  const earliest = schedule.times
    .map((t) => {
      const [h, m] = t.split(':').map((x) => parseInt(x, 10));
      return { h: Number.isFinite(h) ? h : 9, m: Number.isFinite(m) ? m : 0 };
    })
    .sort((a, b) => a.h - b.h || a.m - b.m)[0];
  const reminderHour = Math.max(6, earliest.h - 2); // nudge 2 hours before first dose, min 6 AM
  return { weekday: expoWeekday, hour: reminderHour, minute: earliest.m };
}

/**
 * Schedule refill reminders via intent system (reconcile will schedule with appTag).
 */
export async function scheduleRefillReminders(meds: Med[]): Promise<void> {
  // PHASE 3 FIX: Check notification permissions before scheduling
  const { granted, status } = await Notifications.getPermissionsAsync();
  if (!granted && status !== 'granted') {
    logger.warn('[REFILL_REMINDERS] Notification permission not granted; skipping refill reminder schedule');
    return;
  }

  await clearIntentsByPrefix(REFILL_INTENT_PREFIX);

  for (const med of meds) {
    const schedule = resolveReminderSchedule(med);
    if (!schedule || !med.id) continue;
    try {
      const logicalKey = `${REFILL_INTENT_PREFIX}${med.id}`;
      await setIntent(logicalKey, {
        type: 'MED_REFILL',
        medId: med.id,
        medName: med.name,
        weekday: schedule.weekday,
        hour: schedule.hour,
        minute: schedule.minute,
        title: 'Medication refill check',
        body: `How is your supply of ${med.name}? Order a refill if you're running low.`,
        channelId: 'reminder-chime',
        // PHASE 5 FIX: Explicit appTag ensures these notifications are managed by reconciler
        appTag: 'reclaim',
      });
    } catch {
      // ignore single failures
    }
  }

  await reconcileNotifications();
}

/**
 * Cancel all refill reminders by clearing intents.
 */
export async function cancelRefillReminders(): Promise<void> {
  await clearIntentsByPrefix(REFILL_INTENT_PREFIX);
  await reconcileNotifications();
}

export async function rescheduleRefillRemindersIfEnabled(): Promise<void> {
  const settings = await getUserSettings();
  if (!settings.refillRemindersEnabled) {
    await cancelRefillReminders();
    return;
  }
  const meds = await listMeds();
  await scheduleRefillReminders(meds);
}
