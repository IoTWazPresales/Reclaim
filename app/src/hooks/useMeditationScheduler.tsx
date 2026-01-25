// C:\Reclaim\app\src\hooks\useMeditationScheduler.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { googleFitGetLatestSleepSession } from '@/lib/health/googleFitService';
import { type MeditationType } from '@/lib/meditations';
import {
  type MeditationSource,
  serializeMeditationSource,
} from '@/lib/meditationSources';
import type { MeditationAutoRule } from '@/lib/meditationSettings';

const NOTIFICATION_IDS_KEY = '@reclaim/meditation:autoStart:notificationIds:v1';

/**
 * Generate a unique rule ID from a rule for tracking notification IDs.
 */
function getRuleId(rule: MeditationAutoRule): string {
  if (rule.mode === 'fixed_time') {
    return `fixed_time:${rule.type}:${rule.hour}:${rule.minute}`;
  } else {
    return `after_wake:${rule.type}:${rule.offsetMinutes}`;
  }
}

/**
 * Load stored notification IDs per rule.
 */
async function loadNotificationIds(userId: string | null | undefined): Promise<Record<string, string>> {
  try {
    const key = `${NOTIFICATION_IDS_KEY}:${userId || 'anon'}`;
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

/**
 * Save notification ID for a rule.
 */
async function saveNotificationId(
  userId: string | null | undefined,
  ruleId: string,
  notificationId: string
): Promise<void> {
  try {
    const key = `${NOTIFICATION_IDS_KEY}:${userId || 'anon'}`;
    const ids = await loadNotificationIds(userId);
    ids[ruleId] = notificationId;
    await AsyncStorage.setItem(key, JSON.stringify(ids));
  } catch (error) {
    // Non-blocking
    if (__DEV__) {
      console.warn('[meditationScheduler] Failed to save notification ID:', error);
    }
  }
}

/**
 * Remove notification ID for a rule.
 */
async function removeNotificationId(userId: string | null | undefined, ruleId: string): Promise<void> {
  try {
    const key = `${NOTIFICATION_IDS_KEY}:${userId || 'anon'}`;
    const ids = await loadNotificationIds(userId);
    delete ids[ruleId];
    await AsyncStorage.setItem(key, JSON.stringify(ids));
  } catch (error) {
    // Non-blocking
    if (__DEV__) {
      console.warn('[meditationScheduler] Failed to remove notification ID:', error);
    }
  }
}

/**
 * Cancel a notification by ID (non-blocking).
 */
async function cancelNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    // Non-blocking
    if (__DEV__) {
      console.warn('[meditationScheduler] Failed to cancel notification:', error);
    }
  }
}

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
 * Cancels any existing notification for this rule before scheduling a new one.
 */
export async function scheduleMeditationAtTime(
  source: MeditationSource,
  hour: number,
  minute: number,
  rule: MeditationAutoRule,
  userId?: string | null
): Promise<string> {
  await ensureMeditationChannel();

  const ruleId = getRuleId(rule);

  // Cancel existing notification for this rule if any
  const existingIds = await loadNotificationIds(userId);
  const existingId = existingIds[ruleId];
  if (existingId) {
    await cancelNotification(existingId);
  }

  // Schedule new notification
  const notificationId = await Notifications.scheduleNotificationAsync({
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

  // Save new notification ID
  await saveNotificationId(userId, ruleId, notificationId);

  return notificationId;
}

/**
 * Schedule a one-shot meditation reminder offset from the last sleep end.
 * Uses your latest sleep end time and schedules a one-shot for today.
 * Cancels any existing notification for this rule before scheduling a new one.
 */
export async function scheduleMeditationAfterWake(
  source: MeditationSource,
  offsetMinutes: number,
  rule: MeditationAutoRule,
  userId?: string | null
): Promise<string | null> {
  await ensureMeditationChannel();

  const sleepSession = await googleFitGetLatestSleepSession();
  if (!sleepSession) return null;

  const wakeTime = sleepSession.endTime;
  const when = new Date(wakeTime.getTime() + offsetMinutes * 60 * 1000);
  if (when <= new Date()) return null;

  const ruleId = getRuleId(rule);

  // Cancel existing notification for this rule if any
  const existingIds = await loadNotificationIds(userId);
  const existingId = existingIds[ruleId];
  if (existingId) {
    await cancelNotification(existingId);
  }

  // Schedule new notification
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'After-wake meditation',
      body: `Ready for ${labelForSource(source)}?`,
      data: { url: deeplinkForSource(source) },
    },
    trigger: { date: when, channelId: 'meditation' } as Notifications.DateTriggerInput,
  });

  // Save new notification ID
  await saveNotificationId(userId, ruleId, notificationId);

  return notificationId;
}

/**
 * Cancel a meditation rule's notification and remove its stored ID.
 */
export async function cancelMeditationRule(
  rule: MeditationAutoRule,
  userId?: string | null
): Promise<void> {
  const ruleId = getRuleId(rule);
  const existingIds = await loadNotificationIds(userId);
  const existingId = existingIds[ruleId];
  
  if (existingId) {
    await cancelNotification(existingId);
    await removeNotificationId(userId, ruleId);
  }
}
