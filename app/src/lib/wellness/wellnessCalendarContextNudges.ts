/**
 * Calendar time-context wellness nudges (Android). No clinical stress detection.
 * Requires calendar read permission already granted (no silent permission prompts).
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { getEventsForDateRangeIfGranted } from '@/lib/calendar';
import { isDemandingCalendarTitle } from '@/lib/calendarDemanding';
import { logger } from '@/lib/logger';
import { logTelemetry } from '@/lib/telemetry';
import { setIntent } from '@/lib/notifications/NotificationIntentStore';
import { reconcileNotifications } from '@/lib/notifications/NotificationScheduler';
import type { InterventionKey } from '@/lib/mindfulness';

const PREFIX = '@reclaim/wellness/calendar_nudge/';
const PATTERN_PREFIX = '@reclaim/wellness/calendar_pattern/';
const TICK_MS = 5 * 60 * 1000;

export type WellnessCalendarNudgeOptions = {
  getRecentBpm?: () => number | null;
  intervention?: InterventionKey;
};

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function normalizeTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .slice(0, 80);
}

async function sentToday(key: string): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(key);
    if (!v) return false;
    const last = new Date(v);
    const now = new Date();
    return (
      last.getFullYear() === now.getFullYear() &&
      last.getMonth() === now.getMonth() &&
      last.getDate() === now.getDate()
    );
  } catch {
    return false;
  }
}

async function markSent(key: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, new Date().toISOString());
  } catch {
    /* ignore */
  }
}

async function bumpPreEventPatternCount(title: string): Promise<number> {
  const key = `${PATTERN_PREFIX}${normalizeTitle(title)}`;
  try {
    const prev = parseInt((await AsyncStorage.getItem(key)) || '0', 10);
    const next = prev + 1;
    await AsyncStorage.setItem(key, String(next));
    return next;
  } catch {
    return 1;
  }
}

async function fireNudge(
  reason: string,
  body: string,
  intervention: InterventionKey,
  display?: { title?: string },
): Promise<void> {
  const { granted, status } = await Notifications.getPermissionsAsync();
  if (!granted && status !== 'granted') return;

  const title = display?.title ?? 'Wellness support';
  const logicalKey = `wellness_calendar:${reason}`;
  const url = `reclaim://mindfulness?intervention=${encodeURIComponent(intervention)}&autoStart=true`;
  await setIntent(logicalKey, {
    type: 'HEALTH_TRIGGER',
    reason,
    intervention,
    title,
    body,
    url,
  });
  await reconcileNotifications();
  void logTelemetry({
    name: 'wellness_calendar_nudge_scheduled',
    properties: { reason, intervention },
    tags: ['WELLNESS', 'INSIGHT_PARALLEL'],
  }).catch(() => {});
}

export function startWellnessCalendarContextNudges(options: WellnessCalendarNudgeOptions = {}): () => void {
  if (Platform.OS !== 'android') {
    return () => {};
  }

  const intervention = options.intervention ?? 'box_breath_60';
  let timer: ReturnType<typeof setInterval> | null = null;

  const tick = async () => {
    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() - 45 * 60 * 1000);
      const windowEnd = new Date(now.getTime() + 3 * 60 * 60 * 1000);
      const events = await getEventsForDateRangeIfGranted(windowStart, windowEnd);
      if (!events.length) return;

      const bpm = options.getRecentBpm?.() ?? null;
      const hrHint =
        bpm != null && bpm >= 88
          ? ' Your tracker also shows a higher heart rate recently — many things can cause that, not only stress.'
          : '';

      for (const ev of events) {
        if (ev.allDay) continue;
        const title = (ev.title || 'Event').trim();
        const demanding = isDemandingCalendarTitle(title);
        if (!demanding) continue;

        const start = ev.startDate.getTime();
        const end = ev.endDate.getTime();
        const minsToStart = (start - now.getTime()) / 60000;
        const minsSinceEnd = (now.getTime() - end) / 60000;
        const dk = dayKey(now);

        if (minsToStart >= 12 && minsToStart <= 75) {
          const key = `${PREFIX}pre_${ev.id}_${dk}`;
          if (await sentToday(key)) continue;
          const n = await bumpPreEventPatternCount(title);
          const patternHint =
            n >= 4 ? ' This kind of block has shown up on your calendar before — optional steady breathing if it helps.' : '';
          const msg = `You have “${title}” coming up. Optional: a short breathing reset beforehand — not medical advice, just support if you want it.${patternHint}${hrHint}`;
          await fireNudge('wellness_pre_event', msg, intervention, { title: 'Before your next block' });
          await markSent(key);
          return;
        }

        if (minsSinceEnd >= 8 && minsSinceEnd <= 35) {
          const key = `${PREFIX}post_${ev.id}_${dk}`;
          if (await sentToday(key)) continue;
          const msg = `“${title}” just ended. Optional: a minute to decompress — not a diagnosis, just a gentle transition if you want one.${hrHint}`;
          await fireNudge('wellness_post_event', msg, intervention, { title: 'Transition moment' });
          await markSent(key);
          return;
        }
      }
    } catch (e) {
      logger.debug('[wellnessCalendarContextNudges] tick skipped', e);
    }
  };

  void tick();
  timer = setInterval(() => void tick(), TICK_MS);

  return () => {
    if (timer) clearInterval(timer);
    timer = null;
  };
}
