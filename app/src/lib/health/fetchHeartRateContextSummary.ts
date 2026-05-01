import { Platform } from 'react-native';

import { logger } from '@/lib/logger';
import { appleHealthKitFetchRestingHrDailyRows } from './appleHealthKitRestingHrDaily';
import {
  summarizeRestingHeartRateTrend,
  type RestingHeartRateTrendSummary,
} from './heartRateRestingSummary';

const DEFAULT_LOOKBACK_DAYS = 14;

/**
 * Loads platform daily resting-HR rows and builds a conservative trend summary (non-clinical labels).
 * Android: resting HR is not requested from Health Connect (Play Health Connect minimum-scope policy), so this returns insufficient_data. iOS: Apple HealthKit when connected in Integrations.
 */
export async function fetchHeartRateContextSummary(): Promise<RestingHeartRateTrendSummary> {
  try {
    if (Platform.OS === 'android') {
      return summarizeRestingHeartRateTrend([]);
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
