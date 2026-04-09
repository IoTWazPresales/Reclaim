import { Platform } from 'react-native';

import { logger } from '@/lib/logger';
import { appleHealthKitFetchRestingHrDailyRows } from './appleHealthKitRestingHrDaily';
import { healthConnectGetDailyVitals } from './healthConnectService';
import {
  summarizeRestingHeartRateTrend,
  type RestingHeartRateTrendSummary,
} from './heartRateRestingSummary';

const DEFAULT_LOOKBACK_DAYS = 14;

/**
 * Loads platform daily resting-HR rows and builds a conservative trend summary (non-clinical labels).
 * Android: Health Connect. iOS: Apple HealthKit when the user has connected Apple Health in Integrations.
 */
export async function fetchHeartRateContextSummary(): Promise<RestingHeartRateTrendSummary> {
  try {
    if (Platform.OS === 'android') {
      const rows = await healthConnectGetDailyVitals(DEFAULT_LOOKBACK_DAYS);
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
