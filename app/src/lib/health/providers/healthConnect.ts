import { Platform } from 'react-native';
import * as HealthConnect from 'react-native-health-connect';

import type {
  HealthDataProvider,
  HealthMetric,
  HealthPlatform,
  HeartRateSample,
  SleepSession,
  SleepStageSegment,
  StressLevel,
  ActivitySample,
} from '../types';
import { logger } from '@/lib/logger';

const HC = HealthConnect as any;

const sleepStageMap: Record<string, SleepStageSegment['stage']> = {
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
    if (Platform.OS !== 'android') {
      logger.debug('HealthConnectProvider: Not Android platform');
      return false;
    }
    
    try {
      // Check if module exists (package is installed)
      if (!HC || typeof HC !== 'object') {
        logger.debug('HealthConnectProvider: react-native-health-connect module not found - package may not be installed or linked');
        return false;
      }
      
      // Per Google Health Connect documentation: isAvailable() is the official method
      // to check if Health Connect app is installed and accessible
      if (!HC.isAvailable || typeof HC.isAvailable !== 'function') {
        logger.warn('HealthConnectProvider: isAvailable method not found in module - library version may be incompatible');
        return false;
      }
      
      try {
        const available = await HC.isAvailable();
        logger.debug(`HealthConnectProvider: isAvailable() returned ${available}`);
        
        if (available === true) {
          // If available, try to initialize (required before use)
          if (HC.initialize && typeof HC.initialize === 'function') {
            try {
              await HC.initialize();
              logger.debug('HealthConnectProvider: Initialized successfully');
            } catch (initError: any) {
              // Initialization can fail even if app is installed (e.g., needs update)
              logger.warn('HealthConnectProvider: Initialize failed', {
                error: initError?.message,
                code: initError?.code,
                details: 'App may need update or Health Connect service unavailable',
              });
              // Still return true if isAvailable was true - user can update the app
            }
          }
          return true;
        }
        
        logger.debug('HealthConnectProvider: Health Connect app is not installed or not available');
        return false;
      } catch (error: any) {
        // If isAvailable throws, Health Connect is likely not installed
        logger.warn('HealthConnectProvider: isAvailable() threw an error', {
          message: error?.message,
          code: error?.code,
          name: error?.name,
          details: 'Health Connect app likely not installed or needs update',
        });
        return false;
      }
    } catch (error: any) {
      logger.warn('HealthConnectProvider.isAvailable unexpected error', {
        message: error?.message,
        stack: error?.stack?.substring(0, 500),
      });
      return false;
    }
  }

  async requestPermissions(metrics: HealthMetric[]): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    
    try {
      // Per Android Health Connect docs: Initialize before requesting permissions
      // https://developer.android.com/health-and-fitness/health-connect/read-data
      if (HC.initialize && typeof HC.initialize === 'function') {
        try {
          await HC.initialize();
        } catch (initError: any) {
          logger.warn('HealthConnectProvider: Initialize failed during permission request', {
            error: initError?.message,
            code: initError?.code,
          });
          // Continue anyway - initialization might have already succeeded
        }
      }
      
      const recordTypes = resolveRecordTypes(metrics);
      if (!recordTypes.length) {
        logger.warn('HealthConnectProvider: No record types to request permissions for');
        return false;
      }
      
      if (!HC.requestPermission || typeof HC.requestPermission !== 'function') {
        logger.error('HealthConnectProvider: requestPermission method not available');
        return false;
      }
      
      const permissions = recordTypes.map((recordType) => ({
        accessType: 'read' as const,
        recordType,
      }));
      
      const granted = await HC.requestPermission(permissions);
      
      if (!Array.isArray(granted)) {
        logger.warn('HealthConnectProvider: Unexpected permission response format', granted);
        return false;
      }
      
      const allGranted = granted.every((item: any) => {
        if (typeof item === 'object' && item !== null) {
          return item.granted === true || item.accessType === 'read';
        }
        return item === true;
      });
      
      logger.debug('HealthConnectProvider: Permission request result', {
        requested: permissions.length,
        granted: granted.filter((item: any) => 
          (typeof item === 'object' ? item.granted === true : item === true)
        ).length,
        allGranted,
      });
      
      return allGranted;
    } catch (error: any) {
      logger.error('HealthConnectProvider.requestPermissions error', {
        message: error?.message,
        code: error?.code,
        name: error?.name,
      });
      
      // Provide user-friendly error messages
      const errorCode = error?.code || error?.message || '';
      if (errorCode.includes('SERVICE_UNAVAILABLE') || errorCode.includes('NOT_AVAILABLE')) {
        logger.error('HealthConnectProvider: Health Connect service unavailable');
        // User will see the availability check error first
      }
      
      return false;
    }
  }

  async hasPermissions(metrics: HealthMetric[]): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    try {
      const granted = await HC.getGrantedPermissions?.();
      if (!Array.isArray(granted)) return false;
      const recordTypes = resolveRecordTypes(metrics);
      return recordTypes.every((recordType) =>
        granted.some(
          (item: any) =>
            item?.recordType === recordType &&
            (item?.accessType === 'read' || item?.accessType === 'READ')
        )
      );
    } catch (error) {
      logger.warn('HealthConnectProvider.hasPermissions error', error);
      return false;
    }
  }

  async getHeartRate(startDate: Date, endDate: Date): Promise<HeartRateSample[]> {
    if (!(await this.isAvailable())) return [];
    try {
      const response = await HC.readRecords?.('HeartRate', {
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
      const response = await HC.readRecords?.('SleepSession', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        },
      });
      const records = response?.records ?? [];
      return records.map((record: any) => {
        const start = new Date(record.startTime);
        const end = new Date(record.endTime);
        const durationMinutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
        const stages: SleepStageSegment[] = ((record.stages ?? []) as any[]).map((stage) => ({
          start: new Date(stage.startTime),
          end: new Date(stage.endTime),
          stage: sleepStageMap[stage.stageType?.toLowerCase?.()] ?? 'unknown',
        }));
        return {
          startTime: start,
          endTime: end,
          durationMinutes,
          efficiency: record.metadata?.sleepEfficiency ?? undefined,
          stages: stages.length ? stages : undefined,
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

  async getActivity(startDate: Date, endDate: Date): Promise<ActivitySample[]> {
    if (!(await this.isAvailable())) return [];
    try {
      // Read Steps
      const stepsResponse = await HC.readRecords?.('Steps', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        },
      });
      
      // Read ActiveCaloriesBurned
      const caloriesResponse = await HC.readRecords?.('ActiveCaloriesBurned', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        },
      });
      
      const samples: ActivitySample[] = [];
      const dayMap = new Map<string, ActivitySample>();
      
      // Process steps
      const stepsRecords = stepsResponse?.records ?? [];
      stepsRecords.forEach((record: any) => {
        const date = new Date(record.startTime || record.time || startDate);
        date.setHours(0, 0, 0, 0);
        const dateKey = date.toISOString().split('T')[0];
        
        if (!dayMap.has(dateKey)) {
          dayMap.set(dateKey, {
            timestamp: date,
            source: 'health_connect',
          });
        }
        const sample = dayMap.get(dateKey)!;
        sample.steps = (sample.steps || 0) + (record.count || 0);
      });
      
      // Process calories
      const caloriesRecords = caloriesResponse?.records ?? [];
      caloriesRecords.forEach((record: any) => {
        const date = new Date(record.startTime || record.time || startDate);
        date.setHours(0, 0, 0, 0);
        const dateKey = date.toISOString().split('T')[0];
        
        if (!dayMap.has(dateKey)) {
          dayMap.set(dateKey, {
            timestamp: date,
            source: 'health_connect',
          });
        }
        const sample = dayMap.get(dateKey)!;
        sample.activeEnergyBurned = (sample.activeEnergyBurned || 0) + (record.energy?.inKilocalories || 0);
      });
      
      return Array.from(dayMap.values());
    } catch (error) {
      logger.warn('HealthConnectProvider.getActivity error', error);
      return [];
    }
  }

  subscribeToHeartRate(): () => void {
    return () => {};
  }

  subscribeToStressLevel(): () => void {
    return () => {};
  }
}

