// C:\Reclaim\app\src\hooks\useNotifications.ts
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useEffect } from 'react';

export async function ensureNotificationPermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.status === 'granted';
}

export function useNotifications() {
  useEffect(() => {
    (async () => {
      const granted = await ensureNotificationPermission();
      if (!granted) console.warn('Notification permission not granted');

      // Android channel (safe on iOS; it no-ops there)
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    })();
  }, []);
}

// ---- quick pings (always time-interval) ----
export async function scheduleMindfulnessPing(minutesFromNow = 5) {
  const granted = await ensureNotificationPermission();
  if (!granted) throw new Error('Notifications are disabled');

  const seconds = Math.max(1, Math.floor(minutesFromNow * 60));
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Mindful minute',
      body: 'One slow, deep breath. Return to now.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      repeats: false,
      channelId: 'default',
    } as Notifications.TimeIntervalTriggerInput,
  });
}

// Helper: difference in seconds from now to a future Date
function secondsUntil(when: Date) {
  return Math.max(1, Math.floor((when.getTime() - Date.now()) / 1000));
}

// ---- meds (platform-aware trigger) ----
// In Expo Go on Android, calendar triggers are not supported -> fallback to timeInterval.
export async function scheduleMedReminder(name: string, dose: string | undefined, when: Date) {
  const granted = await ensureNotificationPermission();
  if (!granted) throw new Error('Notifications are disabled');

  const content = {
    title: 'Medication',
    body: dose ? `${name} — ${dose}` : name,
  };

  const inExpoGoOnAndroid =
    Platform.OS === 'android' && Constants.appOwnership === 'expo';

  if (inExpoGoOnAndroid) {
    // Fallback for Expo Go: schedule by delay
    return Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsUntil(when),
        repeats: false,
        channelId: 'default',
      } as Notifications.TimeIntervalTriggerInput,
    });
  }

  // Dev/production builds (or iOS in Expo Go): use calendar (absolute date)
  return Notifications.scheduleNotificationAsync({
    content,
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      date: when,
      channelId: 'default',
    } as Notifications.CalendarTriggerInput,
  });
}

export async function cancelAllReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
