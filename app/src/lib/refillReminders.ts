import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

import type { Med } from '@/lib/api';
import { listMeds } from '@/lib/api';
import { getUserSettings } from '@/lib/userSettings';

const STORAGE_KEY = '@reclaim/refillReminders:v1';

type StoredRefillMap = Record<string, string>;

async function loadStoredRefills(): Promise<StoredRefillMap> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as StoredRefillMap;
  } catch {
    return {};
  }
}

async function saveStoredRefills(map: StoredRefillMap) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

async function cancelStoredRefills(): Promise<void> {
  const stored = await loadStoredRefills();
  const ids = Object.values(stored);
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
  await AsyncStorage.removeItem(STORAGE_KEY);
}

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

export async function scheduleRefillReminders(meds: Med[]): Promise<void> {
  await cancelStoredRefills();
  const stored: StoredRefillMap = {};

  for (const med of meds) {
    const schedule = resolveReminderSchedule(med);
    if (!schedule || !med.id) continue;
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Medication refill check',
          body: `How is your supply of ${med.name}? Order a refill if you’re running low.`,
          data: { medId: med.id, type: 'MED_REFILL' },
        },
        trigger: {
          ...schedule,
          repeats: true,
        } as Notifications.CalendarTriggerInput,
      });
      stored[med.id] = notificationId;
    } catch {
      // ignore single failures; others will still be scheduled
    }
  }

  if (Object.keys(stored).length) {
    await saveStoredRefills(stored);
  }
}

export async function cancelRefillReminders(): Promise<void> {
  await cancelStoredRefills();
}

export async function rescheduleRefillRemindersIfEnabled(): Promise<void> {
  const settings = await getUserSettings();
  if (!settings.refillRemindersEnabled) {
    await cancelStoredRefills();
    return;
  }
  const meds = await listMeds();
  await scheduleRefillReminders(meds);
}

