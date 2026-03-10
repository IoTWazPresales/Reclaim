/**
 * Get latest wake time from available health providers
 * Priority: Health Connect (Android) > Apple HealthKit (iOS)
 * Returns null if no provider can supply wake time
 */
import { Platform } from 'react-native';
import { healthConnectGetLatestSleepSession } from './healthConnectService';
import { AppleHealthKitProvider } from './providers/appleHealthKit';
import { getIntegrationStatus } from './integrationStore';
import type { SleepSession } from './types';

export type WakeTimeResult = {
  wakeTime: Date;
  source: 'health_connect' | 'apple_healthkit';
} | null;

/**
 * Get latest wake time from available health providers
 * Tries providers in priority order based on platform
 */
export async function getLatestWakeTime(): Promise<WakeTimeResult> {
  if (Platform.OS === 'android') {
    // Android: Health Connect only
    const healthConnectStatus = await getIntegrationStatus('health_connect');
    if (healthConnectStatus?.connected) {
      try {
        const session = await healthConnectGetLatestSleepSession();
        if (session?.endTime) {
          return { wakeTime: session.endTime, source: 'health_connect' };
        }
      } catch (error) {
        // No Health Connect data
      }
    }
  } else if (Platform.OS === 'ios') {
    // iOS: Try Apple HealthKit
    const appleHealthStatus = await getIntegrationStatus('apple_healthkit');
    if (appleHealthStatus?.connected) {
      try {
        const provider = new AppleHealthKitProvider();
        const now = new Date();
        const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const sessions = await provider.getSleepSessions(start, now);
        if (sessions.length > 0) {
          const latest = sessions.sort((a, b) => b.endTime.getTime() - a.endTime.getTime())[0];
          if (latest?.endTime) {
            return { wakeTime: latest.endTime, source: 'apple_healthkit' };
          }
        }
      } catch (error) {
        // No HealthKit data
      }
    }
  }

  return null;
}
