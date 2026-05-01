/**
 * Apple HealthKit — daily resting heart rate samples for the same trend pipeline as Health Connect
 * (feeds `summarizeRestingHeartRateTrend` via `fetchHeartRateContextSummary` on iOS).
 */
import { Platform } from 'react-native';
import AppleHealthKit, { type HealthKitPermissions } from 'react-native-health';

import { logger } from '@/lib/logger';
import { getIntegrationStatus } from '@/lib/health/integrationStore';
import { bucketRestingHrSamplesToDailyRows } from '@/lib/health/restingHrDailyRows';
import type { RestingHrTrendDailyRow } from '@/lib/health/heartRateRestingSummary';

export { bucketRestingHrSamplesToDailyRows } from '@/lib/health/restingHrDailyRows';

const READ_PERMS: HealthKitPermissions = {
  permissions: {
    read: [AppleHealthKit.Constants.Permissions.HeartRate] as HealthKitPermissions['permissions']['read'],
    write: [],
  },
};

/**
 * Last `days` calendar days (including today), one row per day that has at least one resting HR sample.
 * No-op when not iOS, Apple Health not marked connected in Integrations, or HealthKit init fails.
 */
export async function appleHealthKitFetchRestingHrDailyRows(days: number): Promise<RestingHrTrendDailyRow[]> {
  if (Platform.OS !== 'ios') return [];

  const st = await getIntegrationStatus('apple_healthkit');
  if (!st?.connected) return [];

  return new Promise((resolve) => {
    AppleHealthKit.initHealthKit(READ_PERMS, (err: string) => {
      if (err) {
        logger.debug('[HealthKit] resting HR daily vitals: init not available', err);
        resolve([]);
        return;
      }
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - (days - 1));
      start.setHours(0, 0, 0, 0);

      AppleHealthKit.getRestingHeartRate(
        { startDate: start.toISOString(), endDate: end.toISOString() },
        (err2: string, results: unknown) => {
          if (err2 || results == null) {
            resolve([]);
            return;
          }
          const arr = Array.isArray(results) ? results : [results];
          resolve(bucketRestingHrSamplesToDailyRows(arr as any[]));
        },
      );
    });
  });
}
