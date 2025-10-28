// C:\Reclaim\app\src\hooks\useMeditationScheduler.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { MeditationType } from '@/lib/meditations';
import { getLastSleepEndISO } from '@/lib/sleepHealthConnect';

// Build the deep link used by the notification tap
const deeplinkFor = (type: MeditationType) =>
  `reclaim://meditation?type=${encodeURIComponent(type)}&autoStart=true`;

/**
 * Schedule a daily repeating meditation reminder at a fixed local time.
 * Uses a calendar-style repeating trigger (hour/minute).
 */
export async function scheduleMeditationAtTime(
  type: MeditationType,
  hour: number,
  minute: number
) {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('meditation', {
      name: 'Meditation',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Meditation',
      body: `Time for ${type.replace(/_/g, ' ')}.`,
      data: { url: deeplinkFor(type) },
    },
    // ✅ Calendar trigger (repeats daily at hour:minute)
    trigger: {
      hour,
      minute,
      repeats: true,
      channelId: 'meditation',
    } as Notifications.CalendarTriggerInput,
  });
}

/**
 * Schedule a one-shot meditation reminder offset from the last sleep end.
 * Wrap the Date in { date: Date } for the trigger.
 */
export async function scheduleMeditationAfterWake(
  type: MeditationType,
  offsetMinutes: number
) {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('meditation', {
      name: 'Meditation',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const iso = await getLastSleepEndISO();
  if (!iso) return null;

  const end = new Date(iso);
  const when = new Date(end.getTime() + offsetMinutes * 60 * 1000);
  if (when <= new Date()) return null;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'After-wake meditation',
      body: `Ready for ${type.replace(/_/g, ' ')}?`,
      data: { url: deeplinkFor(type) },
    },
    // ✅ Date trigger (one-shot at an absolute Date/Time)
    trigger: { date: when } as Notifications.DateTriggerInput,
  });
}
