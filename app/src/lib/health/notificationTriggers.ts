/**
 * Health-based notification triggers (Android: Health Connect).
 * - HR spike path: recent HR polling + resting context + daily cooldown.
 * - Calendar context path: optional pre/post event wellness nudges when calendar read is already granted.
 * iOS: reactive HR stream not wired; calendar nudges are Android-only in this module.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MeditationType } from '@/lib/meditations';
import { logger } from '@/lib/logger';
import { setIntent } from '@/lib/notifications/NotificationIntentStore';
import { reconcileNotifications } from '@/lib/notifications/NotificationScheduler';
import type { InterventionKey } from '@/lib/mindfulness';
import { fetchHeartRateContextSummary } from './fetchHeartRateContextSummary';
import { hrSpikeShouldTriggerMindfulness } from './hrSpikeMindfulnessGate';
import type { RestingHeartRateTrendSummary } from './heartRateRestingSummary';
import {
  healthConnectHasPermissions,
  healthConnectIsAvailable,
  healthConnectSubscribeRecentHeartRate,
} from './healthConnectService';
import { startWellnessCalendarContextNudges } from '@/lib/wellness/wellnessCalendarContextNudges';

export type HealthTriggerConfig = {
  enabled: boolean;
  heartRateSpikeThreshold?: number;
  /** Legacy config field (unused for notifications). Kept for serialization compatibility. */
  stressThreshold?: number;
  lowActivityThreshold?: number;
  meditationType?: MeditationType;
  intervention?: InterventionKey;
};

const DEFAULT_CONFIG: HealthTriggerConfig = {
  enabled: true,
  heartRateSpikeThreshold: 100,
  stressThreshold: 70,
  lowActivityThreshold: 3000,
  meditationType: 'body_scan',
  intervention: 'box_breath_60',
};

let currentConfig: HealthTriggerConfig = DEFAULT_CONFIG;
let unsubscribeFunctions: (() => void)[] = [];
/** Latest BPM from HC polling (Android), for optional calendar-context copy only. */
let lastRecentBpm: number | null = null;

const HR_CONTEXT_CACHE_MS = 10 * 60 * 1000;
let cachedHrContextSummary: { at: number; value: RestingHeartRateTrendSummary } | null = null;

async function getHrContextSummaryCached(): Promise<RestingHeartRateTrendSummary> {
  const now = Date.now();
  if (cachedHrContextSummary && now - cachedHrContextSummary.at < HR_CONTEXT_CACHE_MS) {
    return cachedHrContextSummary.value;
  }
  const value = await fetchHeartRateContextSummary();
  cachedHrContextSummary = { at: now, value };
  return value;
}

const LAST_NOTIFICATION_KEY_PREFIX = '@reclaim/health/notifications/last_';

async function wasNotificationSentToday(triggerType: string): Promise<boolean> {
  try {
    const key = `${LAST_NOTIFICATION_KEY_PREFIX}${triggerType}`;
    const lastSentISO = await AsyncStorage.getItem(key);
    if (!lastSentISO) return false;

    const lastSent = new Date(lastSentISO);
    const now = new Date();

    return (
      lastSent.getFullYear() === now.getFullYear() &&
      lastSent.getMonth() === now.getMonth() &&
      lastSent.getDate() === now.getDate()
    );
  } catch (error) {
    logger.warn('Failed to check notification sent status:', error);
    return false;
  }
}

async function markNotificationSentToday(triggerType: string): Promise<void> {
  try {
    const key = `${LAST_NOTIFICATION_KEY_PREFIX}${triggerType}`;
    await AsyncStorage.setItem(key, new Date().toISOString());
  } catch (error) {
    logger.warn('Failed to mark notification as sent:', error);
  }
}

async function attachHeartRateSpikeHandler(): Promise<void> {
  if (currentConfig.heartRateSpikeThreshold === undefined) return;

  if (Platform.OS !== 'android') {
    logger.debug('[HEALTH_TRIGGER] Reactive HR triggers are Android + Health Connect only in this build');
    return;
  }

  const onSample = async (sample: { value: number }) => {
    lastRecentBpm = sample.value;
    const threshold = currentConfig.heartRateSpikeThreshold ?? 100;
    if (sample.value < threshold) return;

    const summary = await getHrContextSummaryCached();
    const shouldFire = hrSpikeShouldTriggerMindfulness(sample.value, threshold, summary, {
      liveSamplesMisalignedWithRestingContext: true,
    });
    if (!shouldFire) {
      logger.debug('[HEALTH_TRIGGER] HR spike gated (limited or misaligned context)', {
        bpm: sample.value,
        threshold,
        sufficiency: summary.sufficiency,
        misalignedLiveVsResting: true,
      });
      return;
    }

    const triggerType = 'elevated_heart_rate';
    const alreadySent = await wasNotificationSentToday(triggerType);
    if (!alreadySent) {
      const bpmRounded = Math.round(sample.value);
      await triggerMindfulnessNotification(
        triggerType,
        `Your tracker reported a higher heart rate (${bpmRounded} bpm) than your alert threshold. That can be normal during movement, stress, or many other causes — not a diagnosis or medical readout. Optional: a short breathing reset if you want one.`,
        currentConfig.intervention || 'box_breath_60',
        { title: 'Optional: short reset' },
      );
      await markNotificationSentToday(triggerType);
    }
  };

  const available = await healthConnectIsAvailable();
  if (!available) {
    logger.debug('Health Connect unavailable; skipping health triggers');
    return;
  }
  const hasPermissions = await healthConnectHasPermissions(['heart_rate']);
  if (!hasPermissions) {
    logger.debug(
      'Health Connect heart rate permission not granted; skipping health triggers (no auto-authorize)',
    );
    return;
  }
  const unsub = healthConnectSubscribeRecentHeartRate((sample) => {
    void onSample(sample);
  });
  unsubscribeFunctions.push(unsub);
}

/**
 * Start health-based notification triggers
 */
export async function startHealthTriggers(config?: Partial<HealthTriggerConfig>) {
  currentConfig = { ...DEFAULT_CONFIG, ...config };
  if (!currentConfig.enabled) return;

  unsubscribeFunctions.forEach((unsub) => unsub());
  unsubscribeFunctions = [];
  lastRecentBpm = null;

  await attachHeartRateSpikeHandler();

  if (Platform.OS === 'android') {
    const stopCal = startWellnessCalendarContextNudges({
      getRecentBpm: () => lastRecentBpm,
      intervention: currentConfig.intervention || 'box_breath_60',
    });
    unsubscribeFunctions.push(stopCal);
  }

  logger.debug('Health-based notification triggers started', {
    ...currentConfig,
    platform: Platform.OS,
    source: Platform.OS === 'android' ? 'health_connect+calendar_context' : 'inactive',
  });
}

/**
 * Stop health-based notification triggers
 */
export async function stopHealthTriggers() {
  unsubscribeFunctions.forEach((unsub) => unsub());
  unsubscribeFunctions = [];
  lastRecentBpm = null;
  logger.debug('Health-based notification triggers stopped');
}

async function triggerMindfulnessNotification(
  reason: string,
  message: string,
  intervention: InterventionKey,
  display?: { title?: string },
) {
  const { granted, status } = await Notifications.getPermissionsAsync();
  if (!granted && status !== 'granted') {
    logger.warn('[HEALTH_TRIGGER] Notification permission not granted; skipping health trigger', { reason });
    return;
  }

  const title = display?.title ?? 'Mindfulness Suggestion';
  const logicalKey = `health_trigger:${reason}`;
  const url = `reclaim://mindfulness?intervention=${encodeURIComponent(intervention)}&autoStart=true`;
  await setIntent(logicalKey, {
    type: 'HEALTH_TRIGGER',
    reason,
    intervention,
    title,
    body: message,
    url,
  });
  logger.debug('[NOTIF_CUTOVER] health trigger → intent + reconcile');
  await reconcileNotifications();
  logger.debug('Health trigger notification sent', { reason, intervention });
}

export function getHealthTriggerConfig(): HealthTriggerConfig {
  return { ...currentConfig };
}

export async function updateHealthTriggerConfig(config: Partial<HealthTriggerConfig>) {
  await stopHealthTriggers();
  await startHealthTriggers({ ...currentConfig, ...config });
}
