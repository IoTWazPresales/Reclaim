import { Platform } from 'react-native';

import { logger } from '@/lib/logger';
import { appleHealthKitFetchRestingHrDailyRows } from './appleHealthKitRestingHrDaily';
import { healthConnectFetchRestingHrDailyRows } from './healthConnectRestingHrDaily';
import {
  summarizeRestingHeartRateTrend,
  type RestingHeartRateTrendSummary,
} from './heartRateRestingSummary';

const DEFAULT_LOOKBACK_DAYS = 14;

/**
 * Loads platform daily resting-HR rows and builds a conservative trend summary (non-clinical labels).
 * Android: overnight HeartRate proxy (not RestingHeartRate record — Play minimum-scope).
 * iOS: Apple HealthKit when connected in Integrations.
 */
export async function fetchHeartRateContextSummary(): Promise<RestingHeartRateTrendSummary> {
  try {
    if (Platform.OS === 'android') {
      const rows = await healthConnectFetchRestingHrDailyRows(DEFAULT_LOOKBACK_DAYS);
      return summarizeRestingHeartRateTrend(rows);
    }
    if (Platform.OS === 'ios') {
      const rows = await appleHealthKitFetchRestingHrDailyRows(DEFAULT_LOOKBACK_DAYS);
      return summarizeRestingHeartRateTrend(rows);
    }
  } catch (e) {
    logger.warn('[fetchHeartRateContextSummary] failed', e);
  }
  return summarizeRestingHeartRateTrend([]);
}
