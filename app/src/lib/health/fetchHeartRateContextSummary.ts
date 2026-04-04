import { Platform } from 'react-native';

import { healthConnectGetDailyVitals } from './healthConnectService';
import {
  summarizeRestingHeartRateTrend,
  type RestingHeartRateTrendSummary,
} from './heartRateRestingSummary';

const DEFAULT_LOOKBACK_DAYS = 14;

/**
 * Loads Health Connect daily vitals (Android) and builds a conservative resting-HR trend summary.
 * iOS returns the empty summary until a parallel HealthKit aggregation path exists.
 */
export async function fetchHeartRateContextSummary(): Promise<RestingHeartRateTrendSummary> {
  if (Platform.OS !== 'android') {
    return summarizeRestingHeartRateTrend([]);
  }
  const rows = await healthConnectGetDailyVitals(DEFAULT_LOOKBACK_DAYS);
  return summarizeRestingHeartRateTrend(rows);
}
