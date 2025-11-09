import { Platform } from 'react-native';
import * as HealthConnect from 'react-native-health-connect';

import type {
  HealthDataProvider,
  HealthMetric,
  HealthPlatform,
  HeartRateSample,
  SleepSession,
  StressLevel,
  ActivitySample,
} from '../types';
import { logger } from '@/lib/logger';

const sleepStageMap: Record<string, SleepSession['stages'][number]['stage']> = {
  awake: 'awake',
  light: 'light',
  deep: 'deep',
  rem: 'rem',
};

function resolveRecordTypes(metrics: HealthMetric[]): string[] {
  const map: Record<HealthMetric, string[]> = {
    heart_rate: ['HeartRate'],
    resting_heart_rate: ['RestingHeartRate'],
    heart_rate_variability: ['HeartRateVariabilityRmssd'],
    sleep_analysis: ['SleepSession'],
    sleep_stages: ['SleepStage'],
    stress_level: [],
    steps: ['Steps'],
    active_energy: ['TotalCaloriesBurned', 'ActiveCaloriesBurned'],
    activity_level: ['ExerciseSession'],
  };

  const recordTypes = new Set<string>();
  metrics.forEach((metric) => {
    map[metric]?.forEach((type) => recordTypes.add(type));
  });
  return Array.from(recordTypes);
}

export class HealthConnectProvider implements HealthDataProvider {
  platform: HealthPlatform = 'health_connect';

  async isAvailable(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    try {
      return (await HealthConnect.isAvailable?.()) ?? false;
    } catch {
      return false;
    }
  }

  async requestPermissions(metrics: HealthMetric[]): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    try {
      await HealthConnect.initialize?.();
      const recordTypes = resolveRecordTypes(metrics);
      if (!recordTypes.length) return false;
      const permissions = recordTypes.map((recordType) => ({
        accessType: 'read',
        recordType,
      }));
      const granted = await HealthConnect.requestPermission?.(permissions);
      return Array.isArray(granted) ? granted.every((item: { granted: boolean }) => item.granted) : false;
    } catch (error) {
      logger.warn('HealthConnectProvider.requestPermissions error', error);
      return false;
    }
  }

  async hasPermissions(metrics: HealthMetric[]): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    try {
      const granted = await HealthConnect.getGrantedPermissions?.();
      if (!Array.isArray(granted)) return false;
      const recordTypes = resolveRecordTypes(metrics);
      return recordTypes.every((recordType) =>
        granted.some((item: { recordType: string; accessType: string }) => item.recordType === recordType)
      );
    } catch (error) {
      logger.warn('HealthConnectProvider.hasPermissions error', error);
      return false;
    }
  }

  async getHeartRate(startDate: Date, endDate: Date): Promise<HeartRateSample[]> {
    if (!(await this.isAvailable())) return [];
    try {
      const response = await HealthConnect.readRecords?.('HeartRate', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        },
      });
      const records = response?.records ?? [];
      return records.map((record: any) => ({
        value: Number(record.samples?.[0]?.beatsPerMinute ?? record.beatsPerMinute ?? 0),
        timestamp: new Date(record.time ?? record.startTime ?? startDate),
        source: 'health_connect',
      }));
    } catch (error) {
      logger.warn('HealthConnectProvider.getHeartRate error', error);
      return [];
    }
  }

  async getRestingHeartRate(startDate: Date, endDate: Date): Promise<number | null> {
    const records = await this.getHeartRate(startDate, endDate);
    if (!records.length) return null;
    const resting = records.map((sample) => sample.value).filter(Boolean);
    if (!resting.length) return null;
    return Math.round(resting.reduce((acc, val) => acc + val, 0) / resting.length);
  }

  async getSleepSessions(startDate: Date, endDate: Date): Promise<SleepSession[]> {
    if (!(await this.isAvailable())) return [];
    try {
      const response = await HealthConnect.readRecords?.('SleepSession', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        },
        timeRangeFilterAdjustment: {
          startTime: 'adjustToStart',
          endTime: 'adjustToEnd',
        },
      });
      const records = response?.records ?? [];
      return records.map((record: any) => {
        const start = new Date(record.startTime);
        const end = new Date(record.endTime);
        const durationMinutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
        const stages =
          record.stages?.map((stage: any) => ({
            start: new Date(stage.startTime),
            end: new Date(stage.endTime),
            stage: sleepStageMap[stage.stageType?.toLowerCase?.()] ?? 'unknown',
          })) ?? [];
        return {
          startTime: start,
          endTime: end,
          durationMinutes,
          efficiency: record.metadata?.sleepEfficiency ?? null,
          stages,
          source: 'health_connect',
        };
      });
    } catch (error) {
      logger.warn('HealthConnectProvider.getSleepSessions error', error);
      return [];
    }
  }

  async getStressLevel(): Promise<StressLevel[]> {
    return [];
  }

  async getActivity(): Promise<ActivitySample[]> {
    return [];
  }

  subscribeToHeartRate(): () => void {
    return () => {};
  }

  subscribeToStressLevel(): () => void {
    return () => {};
  }
}

