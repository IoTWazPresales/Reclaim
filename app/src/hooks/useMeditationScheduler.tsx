// C:\Reclaim\app\src\hooks\useMeditationScheduler.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { googleFitGetLatestSleepSession } from '@/lib/health/googleFitService';
import { type MeditationType } from '@/lib/meditations';
import {
  type MeditationSource,
  serializeMeditationSource,
} from '@/lib/meditationSources';

/**
 * Extract a MeditationType from a source, if it's a built-in/script meditation.
 * Returns null for external/audio.
 */
function meditationTypeFromSource(source: MeditationSource): MeditationType | null {
  if (source.kind === 'script') return source.scriptId;
  if (source.kind === 'built_in') return source.type;
  return null;
}

/**
 * Build the deep link used by the notification tap.
 *
 * ✅ Preferred: pass the full serialized source so MeditationScreen can auto-start the exact item
 * (script/audio/external) and also persist it as the default if you want.
 *
 * Fallback: for legacy compatibility, we can still pass ?type= for script/built_in.
 */
function deeplinkForSource(source: MeditationSource) {
  try {
    const encoded = encodeURIComponent(serializeMeditationSource(source));
    return `reclaim://meditation?source=${encoded}&autoStart=true`;
  } catch {
    // Fallback to legacy type deep link if serialization ever fails
    const type = meditationTypeFromSource(source);
    if (type) return `reclaim://meditation?type=${encodeURIComponent(type)}&autoStart=true`;
    return `reclaim://meditation?autoStart=true`;
  }
}

function labelForSource(source: MeditationSource) {
  const type = meditationTypeFromSource(source);
  if (type) return String(type).replace(/_/g, ' ');

  if (source.kind === 'audio') return source.title;
  if (source.kind === 'external') return source.title;

  // should never reach here, but keeps TS happy if union changes later
  return 'Meditation';
}

async function ensureMeditationChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('meditation', {
    name: 'Meditation',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/**
 * Schedule a daily repeating meditation reminder at a fixed local time.
 * Uses a calendar-style repeating trigger (hour/minute).
 */
export async function scheduleMeditationAtTime(source: MeditationSource, hour: number, minute: number) {
  await ensureMeditationChannel();

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Meditation',
      body: `Time for ${labelForSource(source)}.`,
      data: { url: deeplinkForSource(source) },
    },
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
 * Uses your latest sleep end time and schedules a one-shot for today.
 */
export async function scheduleMeditationAfterWake(source: MeditationSource, offsetMinutes: number) {
  await ensureMeditationChannel();

  const sleepSession = await googleFitGetLatestSleepSession();
  if (!sleepSession) return null;

  const wakeTime = sleepSession.endTime;
  const when = new Date(wakeTime.getTime() + offsetMinutes * 60 * 1000);
  if (when <= new Date()) return null;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'After-wake meditation',
      body: `Ready for ${labelForSource(source)}?`,
      data: { url: deeplinkForSource(source) },
    },
    trigger: { date: when } as Notifications.DateTriggerInput,
  });
}
