/**
 * Health-Based Notification Triggers
 * Automatically triggers mindfulness/meditation notifications based on health data
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getUnifiedHealthService } from './unifiedService';
import type { MeditationType } from '@/lib/meditations';
import { logger } from '@/lib/logger';
import { simpleRuleEngine, type InterventionKey } from '@/lib/mindfulness';
import { INTERVENTIONS } from '@/lib/mindfulness';
import { scheduleNotificationAsync } from 'expo-notifications';

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

/**
 * Start health-based notification triggers
 */
export async function startHealthTriggers(config?: Partial<HealthTriggerConfig>) {
  currentConfig = { ...DEFAULT_CONFIG, ...config };
  if (!currentConfig.enabled) return;

  const healthService = getUnifiedHealthService();

  // Ensure permissions
  await healthService.requestAllPermissions();
  await healthService.startMonitoring();

  // Clear existing subscriptions
  unsubscribeFunctions.forEach((unsub) => unsub());
  unsubscribeFunctions = [];

  // Heart rate spike trigger
  if (currentConfig.heartRateSpikeThreshold !== undefined) {
    const unsub = healthService.onHeartRateSpike(async (sample) => {
      if (sample.value >= (currentConfig.heartRateSpikeThreshold || 100)) {
        await triggerMindfulnessNotification(
          'elevated_heart_rate',
          `Your heart rate is elevated (${Math.round(sample.value)} bpm). Take a moment to breathe.`,
          currentConfig.intervention || 'box_breath_60'
        );
      }
    });
    unsubscribeFunctions.push(unsub);
  }

  // High stress trigger
  if (currentConfig.stressThreshold !== undefined) {
    const unsub = healthService.onHighStress(async (level) => {
      if (level.value >= (currentConfig.stressThreshold || 70)) {
        await triggerMindfulnessNotification(
          'high_stress',
          `You seem stressed (${Math.round(level.value)}/100). A quick mindfulness break might help.`,
          currentConfig.intervention || 'five_senses'
        );
      }
    });
    unsubscribeFunctions.push(unsub);
  }

  // Low activity trigger (suggest movement-based mindfulness)
  if (currentConfig.lowActivityThreshold !== undefined) {
    const unsub = healthService.onLowActivity(async (sample) => {
      const steps = sample.steps || 0;
      if (steps < (currentConfig.lowActivityThreshold || 3000)) {
        const now = new Date();
        // Only trigger once per day, in the afternoon
        if (now.getHours() >= 14 && now.getHours() < 18) {
          await triggerMindfulnessNotification(
            'low_activity',
            `You've been less active today (${steps} steps). Consider a mindful walk or gentle movement.`,
            'five_senses'
          );
        }
      }
    });
    unsubscribeFunctions.push(unsub);
  }

  // Sleep end trigger (meditation after wake)
  const unsub = healthService.onSleepEnd(async (session) => {
    if (currentConfig.meditationType) {
      const wakeTime = session.endTime;
      const meditationTime = new Date(wakeTime.getTime() + 20 * 60 * 1000); // 20 minutes after wake

      if (meditationTime > new Date()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Morning Meditation',
            body: `You woke up ${Math.round((Date.now() - wakeTime.getTime()) / 60000)} minutes ago. Time for ${currentConfig.meditationType.replace(/_/g, ' ')}?`,
            data: {
              url: `reclaim://meditation?type=${encodeURIComponent(currentConfig.meditationType)}&autoStart=true`,
              type: 'HEALTH_TRIGGER',
            },
          },
          trigger: { date: meditationTime } as Notifications.DateTriggerInput,
        });
      }
    }
  });
  unsubscribeFunctions.push(unsub);

  logger.debug('Health-based notification triggers started', currentConfig);
}

/**
 * Stop health-based notification triggers
 */
export async function stopHealthTriggers() {
  unsubscribeFunctions.forEach((unsub) => unsub());
  unsubscribeFunctions = [];
  const healthService = getUnifiedHealthService();
  await healthService.stopMonitoring();
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
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('mindfulness-health', {
      name: 'Mindfulness (Health Triggers)',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: undefined,
    });
  }

  // For immediate notifications, use null trigger
  // Channel is set via setNotificationChannelAsync for Android
  const trigger: any = null;

  await scheduleNotificationAsync({
    content: {
      title: 'Mindfulness Suggestion',
      body: message,
      categoryIdentifier: 'MOOD_REMINDER',
      data: {
        type: 'HEALTH_TRIGGER',
        reason,
        intervention,
        url: `reclaim://mindfulness?intervention=${encodeURIComponent(intervention)}&autoStart=true`,
      },
    },
    trigger: trigger, // Immediate on iOS, with channelId on Android
  });

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

