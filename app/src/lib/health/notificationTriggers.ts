/**
 * Health-Based Notification Triggers
 * Automatically triggers mindfulness/meditation notifications based on health data
 */
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getGoogleFitProvider,
  googleFitHasPermissions,
  googleFitSubscribeHeartRate,
  googleFitSubscribeStress,
} from './googleFitService';
import type { MeditationType } from '@/lib/meditations';
import { logger } from '@/lib/logger';
import { setIntent } from '@/lib/notifications/NotificationIntentStore';
import { reconcileNotifications } from '@/lib/notifications/NotificationScheduler';
import {
  INTERVENTIONS,
  simpleRuleEngine,
  type InterventionKey,
} from '@/lib/mindfulness';

export type HealthTriggerConfig = {
  enabled: boolean;
  heartRateSpikeThreshold?: number; // bpm
  stressThreshold?: number; // 0-100
  lowActivityThreshold?: number; // steps
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

// Storage key for tracking last notification sent per trigger type
const LAST_NOTIFICATION_KEY_PREFIX = '@reclaim/health/notifications/last_';

/**
 * Check if a notification was already sent today for a given trigger type
 */
async function wasNotificationSentToday(triggerType: string): Promise<boolean> {
  try {
    const key = `${LAST_NOTIFICATION_KEY_PREFIX}${triggerType}`;
    const lastSentISO = await AsyncStorage.getItem(key);
    if (!lastSentISO) return false;
    
    const lastSent = new Date(lastSentISO);
    const now = new Date();
    
    // Check if last sent was today (same calendar day)
    return (
      lastSent.getFullYear() === now.getFullYear() &&
      lastSent.getMonth() === now.getMonth() &&
      lastSent.getDate() === now.getDate()
    );
  } catch (error) {
    logger.warn('Failed to check notification sent status:', error);
    return false; // If we can't check, allow notification (fail open)
  }
}

/**
 * Mark that a notification was sent today for a given trigger type
 */
async function markNotificationSentToday(triggerType: string): Promise<void> {
  try {
    const key = `${LAST_NOTIFICATION_KEY_PREFIX}${triggerType}`;
    await AsyncStorage.setItem(key, new Date().toISOString());
  } catch (error) {
    logger.warn('Failed to mark notification as sent:', error);
  }
}

/**
 * Start health-based notification triggers
 */
export async function startHealthTriggers(config?: Partial<HealthTriggerConfig>) {
  currentConfig = { ...DEFAULT_CONFIG, ...config };
  if (!currentConfig.enabled) return;

  const provider = getGoogleFitProvider();
  const available = await provider.isAvailable();
  if (!available) {
    logger.debug('Google Fit unavailable; skipping health triggers');
    return;
  }

  const hasPermissions = await googleFitHasPermissions();
  if (!hasPermissions) {
    // IMPORTANT: Do not auto-launch Google Fit OAuth from background/startup flows.
    // Permissions should only be requested from an explicit user action (Integrations/Onboarding).
    logger.debug('Google Fit permissions not granted; skipping health triggers (no auto-authorize)');
    return;
  }

  // Clear existing subscriptions
  unsubscribeFunctions.forEach((unsub) => unsub());
  unsubscribeFunctions = [];

  // Heart rate spike trigger
  if (currentConfig.heartRateSpikeThreshold !== undefined) {
    const unsub = googleFitSubscribeHeartRate(async (sample) => {
      if (sample.value >= (currentConfig.heartRateSpikeThreshold || 100)) {
        const triggerType = 'elevated_heart_rate';
        const alreadySent = await wasNotificationSentToday(triggerType);
        if (!alreadySent) {
          await triggerMindfulnessNotification(
            triggerType,
            `Your heart rate is elevated (${Math.round(sample.value)} bpm). Take a moment to breathe.`,
            currentConfig.intervention || 'box_breath_60'
          );
          await markNotificationSentToday(triggerType);
        }
      }
    });
    unsubscribeFunctions.push(unsub);
  }

  // High stress trigger
  if (currentConfig.stressThreshold !== undefined) {
    const unsub = googleFitSubscribeStress(async (level) => {
      if (level.value >= (currentConfig.stressThreshold || 70)) {
        const triggerType = 'high_stress';
        const alreadySent = await wasNotificationSentToday(triggerType);
        if (!alreadySent) {
          await triggerMindfulnessNotification(
            triggerType,
            `You seem stressed (${Math.round(level.value)}/100). A quick mindfulness break might help.`,
            currentConfig.intervention || 'five_senses'
          );
          await markNotificationSentToday(triggerType);
        }
      }
    });
    unsubscribeFunctions.push(unsub);
  }

  logger.debug('Health-based notification triggers started', currentConfig);
}

/**
 * Stop health-based notification triggers
 */
export async function stopHealthTriggers() {
  unsubscribeFunctions.forEach((unsub) => unsub());
  unsubscribeFunctions = [];
  logger.debug('Health-based notification triggers stopped');
}

/**
 * Trigger a mindfulness notification
 */
async function triggerMindfulnessNotification(
  reason: string,
  message: string,
  intervention: InterventionKey
) {
  // PHASE 3 FIX: Check notification permissions before scheduling
  const { granted, status } = await Notifications.getPermissionsAsync();
  if (!granted && status !== 'granted') {
    logger.warn('[HEALTH_TRIGGER] Notification permission not granted; skipping health trigger', { reason });
    return;
  }
  
  const logicalKey = `health_trigger:${reason}`;
  const url = `reclaim://mindfulness?intervention=${encodeURIComponent(intervention)}&autoStart=true`;
  await setIntent(logicalKey, {
    type: 'HEALTH_TRIGGER',
    reason,
    intervention,
    title: 'Mindfulness Suggestion',
    body: message,
    url,
  });
  logger.debug('[NOTIF_CUTOVER] health trigger → intent + reconcile');
  await reconcileNotifications();
  logger.debug('Health trigger notification sent', { reason, intervention });
}

/**
 * Get current trigger configuration
 */
export function getHealthTriggerConfig(): HealthTriggerConfig {
  return { ...currentConfig };
}

/**
 * Update trigger configuration
 */
export async function updateHealthTriggerConfig(config: Partial<HealthTriggerConfig>) {
  await stopHealthTriggers();
  await startHealthTriggers({ ...currentConfig, ...config });
}

