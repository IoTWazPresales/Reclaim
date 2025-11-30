import { NativeModules, Platform } from 'react-native';

import type {
  HealthDataProvider,
  HealthMetric,
  HealthPlatform,
  HeartRateSample,
  SleepSession,
  ActivitySample,
  StressLevel,
} from '../types';

type NativeSleepSession = {
  start: number;
  end: number;
  uid?: string;
  state?: string | null;
  stages?: Array<{
    start: number;
    end: number;
    stage?: string;
    type?: string;
  }>;
  efficiency?: number;
  deepSleep?: number; // minutes
  remSleep?: number; // minutes
  lightSleep?: number; // minutes
  awake?: number; // minutes
  avgHeartRate?: number;
  minHeartRate?: number;
  maxHeartRate?: number;
  bodyTemperature?: number; // Celsius
};

type NativeHeartRate = {
  value: number;
  timestamp: number;
};

type NativeStepResponse = {
  total: number;
  segments?: Array<{
    value: number;
    start: number;
    end: number;
  }>;
};

function pick<T extends Function>(obj: any, keys: string[]): T | undefined {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === 'function') return v as T;
  }
  return undefined;
}

function buildSamsungNativeShim() {
  const mod = (NativeModules as any)?.SamsungHealth || {};
  const isAvailable = pick<() => Promise<boolean>>(mod, ['isAvailable', 'checkAvailable', 'available']);
  const connect = pick<() => Promise<boolean>>(mod, ['connect', 'authorize', 'requestPermissions']);
  const disconnect = pick<() => void>(mod, ['disconnect', 'deauthorize']);
  const readDailySteps = pick<(s: number, e: number) => Promise<NativeStepResponse>>(mod, [
    'readDailySteps',
    'getDailySteps',
    'readSteps',
    'getSteps',
  ]);
  const readSleepSessions = pick<(s: number, e: number) => Promise<NativeSleepSession[]>>(mod, [
    'readSleepSessions',
    'getSleepSessions',
    'readSleep',
  ]);
  const readHeartRate = pick<(s: number, e: number) => Promise<NativeHeartRate[]>>(mod, [
    'readHeartRate',
    'getHeartRate',
    'readHR',
  ]);
  const hasAll = isAvailable && connect && readDailySteps && readSleepSessions && readHeartRate;
  return hasAll
    ? {
        isAvailable: isAvailable!,
        connect: connect!,
        disconnect: disconnect || (() => {}),
        readDailySteps: readDailySteps!,
        readSleepSessions: readSleepSessions!,
        readHeartRate: readHeartRate!,
      }
    : undefined;
}

const SamsungHealthNative = buildSamsungNativeShim();

export class SamsungHealthProvider implements HealthDataProvider {
  platform: HealthPlatform = 'samsung_health';

  private isSupported() {
    return Platform.OS === 'android' && !!SamsungHealthNative;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      return await SamsungHealthNative!.isAvailable();
    } catch {
      return false;
    }
  }

  async requestPermissions(_: HealthMetric[]): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      // Check if already connected first
      const available = await SamsungHealthNative!.isAvailable();
      if (!available) return false;
      
      // Try a simple read first to check if already authorized
      try {
        const now = Date.now();
        const oneDayAgo = now - 24 * 60 * 60 * 1000;
        await SamsungHealthNative!.readDailySteps(oneDayAgo, now);
        return true; // Already has permissions
      } catch {
        // Not authorized, try to connect
        const connected = await SamsungHealthNative!.connect();
        if (typeof connected === 'boolean') {
          return connected;
        } else if (typeof connected === 'object' && connected !== null && 'success' in connected) {
          return (connected as any).success === true;
        }
        return false;
      }
    } catch (error) {
      console.error('Samsung Health requestPermissions error:', error);
      return false;
    }
  }

  async hasPermissions(_: HealthMetric[]): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      // Check if Samsung Health is available (doesn't require OAuth)
      const available = await SamsungHealthNative!.isAvailable();
      if (!available) return false;
      // Try a simple read to see if we're already connected
      // If this works, we have permissions
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      try {
        await SamsungHealthNative!.readDailySteps(oneDayAgo, now);
        return true;
      } catch {
        // If read fails, we're not connected
        return false;
      }
    } catch {
      return false;
    }
  }

  async getHeartRate(startDate: Date, endDate: Date): Promise<HeartRateSample[]> {
    if (!this.isSupported()) return [];
    try {
      const records = await SamsungHealthNative!.readHeartRate(
        startDate.getTime(),
        endDate.getTime()
      );
      if (!Array.isArray(records)) return [];
      return records.map((record) => ({
        value: record.value,
        timestamp: new Date(record.timestamp),
        source: 'samsung_health',
      }));
    } catch {
      return [];
    }
  }

  async getRestingHeartRate(startDate: Date, endDate: Date): Promise<number | null> {
    const records = await this.getHeartRate(startDate, endDate);
    if (!records.length) return null;
    const restingSamples = records.map((record) => record.value);
    const total = restingSamples.reduce((acc, val) => acc + val, 0);
    return Math.round((total / restingSamples.length) * 10) / 10;
  }

  async getSleepSessions(startDate: Date, endDate: Date): Promise<SleepSession[]> {
    if (!this.isSupported()) {
      console.warn('[SamsungHealth] Not supported on this platform');
      return [];
    }
    try {
      console.log('[SamsungHealth] Fetching sleep sessions', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      const sessions = await SamsungHealthNative!.readSleepSessions(
        startDate.getTime(),
        endDate.getTime()
      );
      console.log('[SamsungHealth] Received sleep sessions', {
        count: Array.isArray(sessions) ? sessions.length : 0,
        isArray: Array.isArray(sessions),
      });
      if (!Array.isArray(sessions)) {
        console.warn('[SamsungHealth] Sleep sessions response is not an array:', typeof sessions);
        return [];
      }
      
      return await Promise.all(sessions.map(async (session: any): Promise<SleepSession> => {
        const startTime = new Date(session.start);
        const endTime = new Date(session.end);
        const durationMinutes = Math.round((session.end - session.start) / 60000);
        
        // Parse sleep stages from native response
        let stages: SleepStageSegment[] | undefined = undefined;
        
        // Try to get stages from session object first
        if (session.stages && Array.isArray(session.stages) && session.stages.length > 0) {
          stages = session.stages.map((s: any) => ({
            start: new Date(s.start || s.startTime || session.start),
            end: new Date(s.end || s.endTime || s.start || session.end),
            stage: this.mapSleepStage(s.stage || s.type || s.stageType) as any,
          }));
        } else if (session.deepSleep || session.remSleep || session.lightSleep || session.awake) {
          // If stages are provided as duration aggregates, reconstruct them
          // This is a simplified reconstruction - actual stages would be better
          stages = [];
          let currentTime = startTime.getTime();
          const totalMinutes = durationMinutes;
          const deepMinutes = session.deepSleep || 0;
          const remMinutes = session.remSleep || 0;
          const lightMinutes = session.lightSleep || 0;
          const awakeMinutes = session.awake || 0;
          
          // Add stages in approximate order (simplified)
          if (deepMinutes > 0) {
            stages.push({
              start: new Date(currentTime),
              end: new Date(currentTime + deepMinutes * 60000),
              stage: 'deep',
            });
            currentTime += deepMinutes * 60000;
          }
          if (remMinutes > 0) {
            stages.push({
              start: new Date(currentTime),
              end: new Date(currentTime + remMinutes * 60000),
              stage: 'rem',
            });
            currentTime += remMinutes * 60000;
          }
          if (lightMinutes > 0) {
            stages.push({
              start: new Date(currentTime),
              end: new Date(currentTime + lightMinutes * 60000),
              stage: 'light',
            });
            currentTime += lightMinutes * 60000;
          }
          if (awakeMinutes > 0) {
            stages.push({
              start: new Date(currentTime),
              end: new Date(currentTime + awakeMinutes * 60000),
              stage: 'awake',
            });
          }
        }
        
        // If no stages from session, try to fetch heart rate during sleep to infer patterns
        if (!stages || stages.length === 0) {
          try {
            const hrSamples = await this.getHeartRate(startTime, endTime);
            if (hrSamples.length > 0) {
              // Could infer sleep stages from heart rate patterns here
              // For now, we'll leave stages undefined
            }
          } catch {
            // Ignore heart rate fetch errors
          }
        }
        
        return {
          startTime,
          endTime,
          durationMinutes,
          efficiency: typeof session.efficiency === 'number' ? session.efficiency : undefined,
          stages: stages && stages.length > 0 ? stages : undefined,
          source: 'samsung_health',
          // Add additional metadata
          metadata: {
            avgHeartRate: session.avgHeartRate,
            minHeartRate: session.minHeartRate,
            maxHeartRate: session.maxHeartRate,
            bodyTemperature: session.bodyTemperature,
            deepSleepMinutes: session.deepSleep,
            remSleepMinutes: session.remSleep,
            lightSleepMinutes: session.lightSleep,
            awakeMinutes: session.awake,
          } as any,
        };
      }));
    } catch (error: any) {
      console.error('[SamsungHealth] getSleepSessions error:', error);
      console.error('[SamsungHealth] Error details:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
        name: error?.name,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      // Return empty array instead of throwing to allow sync to continue
      // The sync function will log that no data was found
      return [];
    }
  }
  
  private mapSleepStage(stage?: string | null): 'awake' | 'light' | 'deep' | 'rem' | 'unknown' {
    if (!stage) return 'unknown';
    const s = String(stage).toLowerCase();
    if (s.includes('deep') || s.includes('slow') || s === '3' || s === '4') return 'deep';
    if (s.includes('rem') || s.includes('rapid')) return 'rem';
    if (s.includes('light') || s === '1' || s === '2') return 'light';
    if (s.includes('awake') || s.includes('wake') || s === '0') return 'awake';
    return 'unknown';
  }

  async getTodayActivity(): Promise<ActivitySample | null> {
    if (!this.isSupported()) return null;
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const stepResponse = await SamsungHealthNative!.readDailySteps(
        startOfDay.getTime(),
        now.getTime()
      );
      const steps = typeof stepResponse === 'object' && stepResponse?.total !== undefined
        ? Number(stepResponse.total) || 0
        : Number(stepResponse ?? 0);
      return {
        timestamp: now,
        source: 'samsung_health',
        steps: Math.round(steps),
      };
    } catch {
      return null;
    }
  }

  async getActivity(startDate: Date, endDate: Date): Promise<ActivitySample[]> {
    const sample = await this.getTodayActivity();
    return sample ? [sample] : [];
  }

  async getStressLevel(): Promise<StressLevel[]> {
    return [];
  }

  async getLatestHeartRate(): Promise<HeartRateSample | null> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const samples = await this.getHeartRate(oneHourAgo, now);
    if (!samples.length) return null;
    return samples[samples.length - 1];
  }

  async getLatestSleepSession(): Promise<SleepSession | null> {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const sessions = await this.getSleepSessions(threeDaysAgo, now);
    if (!sessions.length) return null;
    return sessions.sort(
      (a, b) => b.endTime.getTime() - a.endTime.getTime()
    )[0];
  }

  subscribeToHeartRate(): () => void {
    return () => {};
  }

  subscribeToStressLevel(): () => void {
    return () => {};
  }
}

