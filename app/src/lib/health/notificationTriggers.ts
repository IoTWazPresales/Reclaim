/**
 * Health-based notification triggers (Android: Health Connect).
 * - HR nudge path: polled every ~15 minutes (no fake immediacy). Fires when HR is
 *   sustained above (resting baseline + 35 bpm) across recent samples while steps
 *   say inactive. Max one nudge per 2 hours; silent during quiet hours.
 * - Calendar context path: optional pre/post event wellness nudges when calendar read is already granted.
 * iOS: reactive HR polling not wired; calendar nudges are Android-only in this module.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MeditationType } from '@/lib/meditations';
import { logger } from '@/lib/logger';
import { setIntent } from '@/lib/notifications/NotificationIntentStore';
import { reconcileNotifications } from '@/lib/notifications/NotificationScheduler';
import { getNotificationPreferences, isWithinQuietHours } from '@/lib/notificationPreferences';
import type { InterventionKey } from '@/lib/mindfulness';
import { fetchHeartRateContextSummary } from './fetchHeartRateContextSummary';
import {
  evaluateHrNudge,
  HR_NUDGE_CHECK_INTERVAL_MS,
  HR_NUDGE_DELTA_BPM,
} from './hrNudgeGate';
import type { RestingHeartRateTrendSummary } from './heartRateRestingSummary';
import {
  healthConnectGetRecentHeartRateSamples,
  healthConnectGetRecentStepsCount,
  healthConnectHasPermissions,
  healthConnectIsAvailable,
} from './healthConnectService';
import { startWellnessCalendarContextNudges } from '@/lib/wellness/wellnessCalendarContextNudges';
import { logTelemetry } from '@/lib/telemetry';

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

const HR_NUDGE_LAST_SENT_KEY = '@reclaim/health/notifications/last_hr_nudge_at';

async function getLastHrNudgeAtMs(): Promise<number | null> {
  try {
    const iso = await AsyncStorage.getItem(HR_NUDGE_LAST_SENT_KEY);
    if (!iso) return null;
    const t = new Date(iso).getTime();
    return Number.isFinite(t) ? t : null;
  } catch (error) {
    logger.warn('Failed to read last HR nudge time:', error);
    return null;
  }
}

async function markHrNudgeSent(): Promise<void> {
  try {
    await AsyncStorage.setItem(HR_NUDGE_LAST_SENT_KEY, new Date().toISOString());
  } catch (error) {
    logger.warn('Failed to mark HR nudge as sent:', error);
  }
}

/** One poll pass: read window data, evaluate the gate, fire at most one nudge. */
async function runHrNudgeCheck(): Promise<void> {
  const nowMs = Date.now();
  const samples = await healthConnectGetRecentHeartRateSamples(HR_NUDGE_CHECK_INTERVAL_MS);
  if (samples.length > 0) {
    lastRecentBpm = samples[samples.length - 1].value;
  }

  const summary = await getHrContextSummaryCached();
  const restingBpm = summary.recentMedianBpm ?? summary.baselineMedianBpm;
  const stepsInWindow = await healthConnectGetRecentStepsCount(HR_NUDGE_CHECK_INTERVAL_MS);
  const prefs = await getNotificationPreferences();
  const lastNudgeAtMs = await getLastHrNudgeAtMs();

  const evaluation = evaluateHrNudge({
    samples: samples.map((s) => ({ bpm: s.value, atMs: s.timestamp.getTime() })),
    restingBpm,
    stepsInWindow,
    nowMs,
    lastNudgeAtMs,
    inQuietHours: isWithinQuietHours(new Date(nowMs), prefs),
  });

  if (!evaluation.fire) {
    logger.debug('[HEALTH_TRIGGER] HR nudge gated', {
      reason: evaluation.reason,
      sampleCount: samples.length,
      restingBpm,
      stepsInWindow,
    });
    return;
  }

  await triggerMindfulnessNotification(
    'elevated_heart_rate',
    `Your heart rate has stayed around ${evaluation.avgBpm} bpm — over ${HR_NUDGE_DELTA_BPM} above your resting baseline — while you look inactive. One minute of slow breathing can help. Checks run every ~15 minutes; this is not a medical alert.`,
    currentConfig.intervention || 'box_breath_60',
    { title: 'Elevated heart rate at rest?' },
  );
  await markHrNudgeSent();
}

async function attachHeartRateNudgePolling(): Promise<void> {
  if (Platform.OS !== 'android') {
    logger.debug('[HEALTH_TRIGGER] HR nudges are Android + Health Connect only in this build');
    return;
  }

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

  const safeCheck = () => {
    runHrNudgeCheck().catch((e) => logger.warn('[HEALTH_TRIGGER] HR nudge check failed', e));
  };
  void safeCheck();
  const timer = setInterval(safeCheck, HR_NUDGE_CHECK_INTERVAL_MS);
  unsubscribeFunctions.push(() => clearInterval(timer));
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

  await attachHeartRateNudgePolling();

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
  void logTelemetry({
    name: 'health_trigger_notification_scheduled',
    properties: { reason, intervention },
    tags: ['HEALTH_TRIGGER', 'INSIGHT_PARALLEL'],
  }).catch(() => {});
}

export function getHealthTriggerConfig(): HealthTriggerConfig {
  return { ...currentConfig };
}

/** Background fetch entry — HR nudge when reactive triggers are enabled. */
export async function runBackgroundHrNudgeCheck(): Promise<void> {
  const { loadReactiveTriggersEnabled } = await import('@/lib/mindfulness/reactiveTriggersPreference');
  if (!(await loadReactiveTriggersEnabled())) return;
  if (Platform.OS !== 'android') return;
  if (!(await healthConnectIsAvailable())) return;
  if (!(await healthConnectHasPermissions(['heart_rate']))) return;
  await runHrNudgeCheck();
}

/** __DEV__ only — synthetic elevated HR through the real gate + notification path. */
export async function devTestHrNudgeSynthetic(bpm = 120): Promise<{ fired: boolean; reason?: string }> {
  if (!__DEV__) return { fired: false, reason: 'not_dev' };
  const nowMs = Date.now();
  const samples = [
    { bpm, atMs: nowMs - 120_000 },
    { bpm, atMs: nowMs - 60_000 },
    { bpm, atMs: nowMs },
  ];
  const summary = await getHrContextSummaryCached();
  const restingBpm = summary.recentMedianBpm ?? summary.baselineMedianBpm ?? 60;
  const prefs = await getNotificationPreferences();
  const evaluation = evaluateHrNudge({
    samples,
    restingBpm,
    stepsInWindow: 0,
    nowMs,
    lastNudgeAtMs: null,
    inQuietHours: isWithinQuietHours(new Date(nowMs), prefs),
  });
  if (!evaluation.fire) {
    return { fired: false, reason: evaluation.reason };
  }
  await triggerMindfulnessNotification(
    'elevated_heart_rate_dev',
    `Dev test: heart rate around ${bpm} bpm triggered the mindfulness nudge.`,
    currentConfig.intervention || 'box_breath_60',
    { title: 'Elevated heart rate at rest?' },
  );
  await markHrNudgeSent();
  return { fired: true };
}

export async function updateHealthTriggerConfig(config: Partial<HealthTriggerConfig>) {
  await stopHealthTriggers();
  await startHealthTriggers({ ...currentConfig, ...config });
}
