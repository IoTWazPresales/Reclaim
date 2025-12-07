import AsyncStorage from '@react-native-async-storage/async-storage';
import * as HealthConnect from 'react-native-health-connect';

import type { HealthMetric } from '@/lib/health/types';
import { logger } from '@/lib/logger';

const CHANGE_TOKEN_KEY = '@reclaim/health_connect/changes_token';
const CHANGE_TOKEN_TS_KEY = '@reclaim/health_connect/changes_token_ts';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const METRIC_TO_RECORD_TYPES: Partial<Record<HealthMetric, string[]>> = {
  sleep_analysis: ['SleepSessionRecord'],
  sleep_stages: ['SleepStageRecord'],
  heart_rate: ['HeartRateRecord'],
  resting_heart_rate: ['HeartRateRecord'],
  heart_rate_variability: ['HeartRateRecord'],
  steps: ['StepsRecord'],
  active_energy: ['TotalCaloriesBurnedRecord'],
  activity_level: ['ExerciseSessionRecord'],
  stress_level: [],
};

export const DEFAULT_HEALTH_CONNECT_RECORD_TYPES: string[] = Array.from(
  new Set(
    Object.values(METRIC_TO_RECORD_TYPES)
      .flat()
      .filter((value): value is string => typeof value === 'string')
  )
);

function isTokenExpired(timestampISO: string | null): boolean {
  if (!timestampISO) return true;
  const ts = Date.parse(timestampISO);
  if (Number.isNaN(ts)) return true;
  return Date.now() - ts > THIRTY_DAYS_MS;
}

export function mapMetricsToRecordTypes(metrics: HealthMetric[]): string[] {
  const recordTypes = new Set<string>();
  metrics.forEach((metric) => {
    (METRIC_TO_RECORD_TYPES[metric] || []).forEach((recordType) => recordTypes.add(recordType));
  });
  return recordTypes.size ? Array.from(recordTypes) : DEFAULT_HEALTH_CONNECT_RECORD_TYPES;
}

export async function ensureHealthConnectChangeTracking(recordTypes: string[] = DEFAULT_HEALTH_CONNECT_RECORD_TYPES) {
  const storedToken = await AsyncStorage.getItem(CHANGE_TOKEN_KEY);
  const storedTs = await AsyncStorage.getItem(CHANGE_TOKEN_TS_KEY);
  if (storedToken && !isTokenExpired(storedTs)) {
    return;
  }

  logger.debug('[HealthConnect] Requesting new changes token', { recordTypes });
  const response = await (HealthConnect as any).getChanges({
    recordTypes,
  });

  await AsyncStorage.setItem(CHANGE_TOKEN_KEY, response.nextChangesToken);
  await AsyncStorage.setItem(CHANGE_TOKEN_TS_KEY, new Date().toISOString());
}

export async function fetchHealthConnectChanges(
  recordTypes: string[] = DEFAULT_HEALTH_CONNECT_RECORD_TYPES,
  onChanges?: (response: any) => Promise<void> | void
): Promise<boolean> {
  let storedToken = await AsyncStorage.getItem(CHANGE_TOKEN_KEY);
  if (!storedToken) {
    await ensureHealthConnectChangeTracking(recordTypes);
    storedToken = await AsyncStorage.getItem(CHANGE_TOKEN_KEY);
    if (!storedToken) return false;
  }

  let hasMore = true;
  let currentToken = storedToken;
  let anyChanges = false;

  while (hasMore) {
    const response = await (HealthConnect as any).getChanges({
      changesToken: currentToken,
      recordTypes,
    });

    if (response.changesTokenExpired) {
      logger.warn('[HealthConnect] Changes token expired, restarting tracking');
      await AsyncStorage.removeItem(CHANGE_TOKEN_KEY);
      await AsyncStorage.removeItem(CHANGE_TOKEN_TS_KEY);
      await ensureHealthConnectChangeTracking(recordTypes);
      return false;
    }

    const hasUpserts = response.upsertionChanges?.length;
    const hasDeletes = response.deletionChanges?.length;
    if (hasUpserts || hasDeletes) {
      anyChanges = true;
      if (onChanges) {
        await onChanges(response);
      }
    }

    currentToken = response.nextChangesToken;
    hasMore = response.hasMore;
  }

  await AsyncStorage.setItem(CHANGE_TOKEN_KEY, currentToken);
  await AsyncStorage.setItem(CHANGE_TOKEN_TS_KEY, new Date().toISOString());
  return anyChanges;
}

