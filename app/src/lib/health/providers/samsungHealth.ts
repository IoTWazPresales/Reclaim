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
  // react-native-samsung-health-android exports as SamsungHealthAndroid
  const mod = (NativeModules as any)?.SamsungHealthAndroid;
  
  if (!mod || typeof mod !== 'object') {
    if (__DEV__) {
      console.log('[SamsungHealth] Native module SamsungHealthAndroid not found');
      console.log('[SamsungHealth] Available modules:', Object.keys(NativeModules));
    }
    return undefined;
  }
  
  // The package provides: connect, disconnect, askPermissionAsync, getPermissionAsync, readDataAsync, getStepCountDailie
  // We need to adapt these to our interface
  const hasModule = mod && typeof mod.connect === 'function';
  
  if (__DEV__) {
    console.log('[SamsungHealth] Native module detection:', {
      moduleExists: !!mod,
      hasConnect: typeof mod?.connect === 'function',
      hasDisconnect: typeof mod?.disconnect === 'function',
      hasReadData: typeof mod?.readDataAsync === 'function',
      hasGetStepCount: typeof mod?.getStepCountDailie === 'function',
      availableMethods: Object.keys(mod).filter(k => typeof mod[k] === 'function'),
    });
  }
  
  if (!hasModule) {
    return undefined;
  }
  
  // Create adapter functions to match our expected interface
  return {
    isAvailable: async (): Promise<boolean> => {
      try {
        // Try to connect to check if Samsung Health is available
        const connected = await mod.connect(false);
        return connected === true;
      } catch {
        return false;
      }
    },
    connect: async (): Promise<boolean> => {
      try {
        return await mod.connect(false);
      } catch {
        return false;
      }
    },
    askPermission: async (): Promise<boolean> => {
      try {
        // Use askPermissionAsync if available (per Samsung Health docs)
        if (typeof mod.askPermissionAsync === 'function') {
          const result = await mod.askPermissionAsync();
          return result === true || (typeof result === 'object' && result?.success === true);
        }
        // Fallback to connect if askPermissionAsync not available
        return await mod.connect(false);
      } catch {
        return false;
      }
    },
    getPermission: async (): Promise<boolean> => {
      try {
        // Check current permission status
        if (typeof mod.getPermissionAsync === 'function') {
          const result = await mod.getPermissionAsync();
          return result === true || (typeof result === 'object' && result?.granted === true);
        }
        // Fallback: try a simple read to check permissions
        const now = Date.now();
        const oneDayAgo = now - 24 * 60 * 60 * 1000;
        try {
          await mod.getStepCountDailie({
            startDate: oneDayAgo.toString(),
            endDate: now.toString(),
          });
          return true;
        } catch {
          return false;
        }
      } catch {
        return false;
      }
    },
    disconnect: (): void => {
      try {
        mod.disconnect();
      } catch {
        // Ignore
      }
    },
    readDailySteps: async (start: number, end: number): Promise<NativeStepResponse> => {
      try {
        const result = await mod.getStepCountDailie({
          startDate: start.toString(),
          endDate: end.toString(),
        });
        // Adapt the response format
        const total = Array.isArray(result) 
          ? result.reduce((sum: number, item: any) => sum + (item.count || 0), 0)
          : 0;
        return { total, segments: Array.isArray(result) ? result.map((item: any) => ({
          value: item.count || 0,
          start: item.day_time || start,
          end: item.day_time || end,
        })) : [] };
      } catch (error) {
        console.error('[SamsungHealth] readDailySteps error:', error);
        return { total: 0, segments: [] };
      }
    },
    readSleepSessions: async (start: number, end: number): Promise<NativeSleepSession[]> => {
      try {
        // Read Sleep sessions
        const sleepMetric = mod.createMetric({
          type: mod.Types?.Sleep || 'com.samsung.health.sleep',
          start,
          end,
        });
        const sleepResults = await mod.readDataAsync(sleepMetric);
        
        if (!Array.isArray(sleepResults) || sleepResults.length === 0) {
          return [];
        }
        
        // For each sleep session, also fetch sleep stages and body temperature
        const sessionsWithDetails = await Promise.all(sleepResults.map(async (sleepItem: any) => {
          const sleepId = sleepItem.sleep_id;
          const sessionStart = sleepItem.start_time || start;
          const sessionEnd = sleepItem.end_time || end;
          
          // Fetch sleep stages for this session
          let stages: any[] = [];
          try {
            const stageMetric = mod.createMetric({
              type: mod.Types?.SleepStage || 'com.samsung.health.sleep_stage',
              start: sessionStart,
              end: sessionEnd,
            });
            const stageResults = await mod.readDataAsync(stageMetric);
            if (Array.isArray(stageResults)) {
              // Filter stages for this specific sleep session
              stages = stageResults.filter((s: any) => s.sleep_id === sleepId);
            }
          } catch (stageError) {
            console.warn('[SamsungHealth] Error fetching sleep stages:', stageError);
          }
          
          // Fetch body temperature during sleep (if available)
          let bodyTemperature: number | undefined = undefined;
          try {
            const tempMetric = mod.createMetric({
              type: mod.Types?.BodyTemperature || 'com.samsung.health.body_temperature',
              start: sessionStart,
              end: sessionEnd,
            });
            const tempResults = await mod.readDataAsync(tempMetric);
            if (Array.isArray(tempResults) && tempResults.length > 0) {
              // Get average temperature during sleep
              const temps = tempResults
                .map((t: any) => t.temperature)
                .filter((t: any) => typeof t === 'number');
              if (temps.length > 0) {
                bodyTemperature = temps.reduce((sum: number, t: number) => sum + t, 0) / temps.length;
              }
            }
          } catch (tempError) {
            console.warn('[SamsungHealth] Error fetching body temperature:', tempError);
          }
          
          // Calculate stage durations
          const deepSleep = stages.filter((s: any) => s.stage === 'deep' || s.stage === '3' || s.stage === '4')
            .reduce((sum: number, s: any) => sum + ((s.end_time || sessionEnd) - (s.start_time || sessionStart)) / 60000, 0);
          const remSleep = stages.filter((s: any) => s.stage === 'rem' || s.stage?.toLowerCase().includes('rem'))
            .reduce((sum: number, s: any) => sum + ((s.end_time || sessionEnd) - (s.start_time || sessionStart)) / 60000, 0);
          const lightSleep = stages.filter((s: any) => s.stage === 'light' || s.stage === '1' || s.stage === '2')
            .reduce((sum: number, s: any) => sum + ((s.end_time || sessionEnd) - (s.start_time || sessionStart)) / 60000, 0);
          const awake = stages.filter((s: any) => s.stage === 'awake' || s.stage === '0' || s.stage?.toLowerCase().includes('wake'))
            .reduce((sum: number, s: any) => sum + ((s.end_time || sessionEnd) - (s.start_time || sessionStart)) / 60000, 0);
          
          return {
            start: sessionStart,
            end: sessionEnd,
            uid: sleepId,
            state: sleepItem.custom || null,
            stages: stages.map((s: any) => ({
              start: s.start_time || sessionStart,
              end: s.end_time || sessionEnd,
              stage: s.stage,
            })),
            deepSleep: Math.round(deepSleep),
            remSleep: Math.round(remSleep),
            lightSleep: Math.round(lightSleep),
            awake: Math.round(awake),
            bodyTemperature,
            efficiency: sleepItem.comment ? parseFloat(sleepItem.comment) : undefined,
          };
        }));
        
        return sessionsWithDetails;
      } catch (error) {
        console.error('[SamsungHealth] readSleepSessions error:', error);
        return [];
      }
    },
    readHeartRate: async (start: number, end: number): Promise<NativeHeartRate[]> => {
      try {
        const metric = mod.createMetric({
          type: mod.Types?.HeartRate || 'com.samsung.health.heart_rate',
          start,
          end,
        });
        const result = await mod.readDataAsync(metric);
        return Array.isArray(result) ? result.map((item: any) => ({
          value: item.heart_rate || item.min || 0,
          timestamp: item.update_time || start,
        })) : [];
      } catch (error) {
        console.error('[SamsungHealth] readHeartRate error:', error);
        return [];
      }
    },
    readBloodOxygen: async (start: number, end: number): Promise<Array<{ value: number; timestamp: number }>> => {
      try {
        const metric = mod.createMetric({
          type: mod.Types?.OxygenSaturation || 'com.samsung.health.oxygen_saturation',
          start,
          end,
        });
        const result = await mod.readDataAsync(metric);
        return Array.isArray(result) ? result.map((item: any) => ({
          value: item.spo2 || item.oxygen_saturation || item.value || 0,
          timestamp: item.update_time || item.start_time || start,
        })) : [];
      } catch (error) {
        console.error('[SamsungHealth] readBloodOxygen error:', error);
        return [];
      }
    },
    readBloodPressure: async (start: number, end: number): Promise<Array<{ systolic: number; diastolic: number; timestamp: number }>> => {
      try {
        const metric = mod.createMetric({
          type: mod.Types?.BloodPressure || 'com.samsung.health.blood_pressure',
          start,
          end,
        });
        const result = await mod.readDataAsync(metric);
        return Array.isArray(result) ? result.map((item: any) => ({
          systolic: item.systolic || item.sbp || 0,
          diastolic: item.diastolic || item.dbp || 0,
          timestamp: item.update_time || item.start_time || start,
        })) : [];
      } catch (error) {
        console.error('[SamsungHealth] readBloodPressure error:', error);
        return [];
      }
    },
  };
}

const SamsungHealthNative = buildSamsungNativeShim();

export class SamsungHealthProvider implements HealthDataProvider {
  platform: HealthPlatform = 'samsung_health';

  private isSupported() {
    return Platform.OS === 'android' && !!SamsungHealthNative;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.isSupported()) {
      console.log('[SamsungHealth] Not supported: Platform is not Android or native module not found');
      return false;
    }
    
    // First check if Samsung Health app is installed
    try {
      const { isSamsungHealthInstalled } = await import('@/lib/native/AppDetection');
      const appInstalled = await isSamsungHealthInstalled();
      if (!appInstalled) {
        console.log('[SamsungHealth] Samsung Health app not installed');
        return false;
      }
    } catch (error) {
      console.warn('[SamsungHealth] Error checking app installation:', error);
      // Continue to check native module anyway
    }
    
    try {
      const available = await SamsungHealthNative!.isAvailable();
      console.log(`[SamsungHealth] isAvailable check: ${available}`);
      return available;
    } catch (error: any) {
      console.warn('[SamsungHealth] isAvailable error:', error?.message ?? error);
      return false;
    }
  }

  async requestPermissions(_: HealthMetric[]): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      // Step 1: Check if Samsung Health app is available
      const available = await SamsungHealthNative!.isAvailable();
      if (!available) {
        console.log('[SamsungHealth] App not available');
        return false;
      }
      
      // Step 2: Check if we already have permissions (per Samsung Health docs)
      const hasPermission = await SamsungHealthNative!.getPermission();
      if (hasPermission) {
        console.log('[SamsungHealth] Already has permissions');
        return true;
      }
      
      // Step 3: Request permissions explicitly (per Samsung Health docs)
      console.log('[SamsungHealth] Requesting permissions...');
      const granted = await SamsungHealthNative!.askPermission();
      
      if (granted) {
        console.log('[SamsungHealth] Permissions granted');
        return true;
      } else {
        console.warn('[SamsungHealth] Permissions denied');
        return false;
      }
    } catch (error) {
      console.error('[SamsungHealth] requestPermissions error:', error);
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
          // Add additional metadata including skin/body temperature
          metadata: {
            avgHeartRate: session.avgHeartRate,
            minHeartRate: session.minHeartRate,
            maxHeartRate: session.maxHeartRate,
            bodyTemperature: session.bodyTemperature, // This is skin/body temp during sleep
            skinTemperature: session.bodyTemperature, // Alias for clarity
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

  /**
   * Get blood oxygen (SpO2) readings from Samsung Health
   * Returns array of SpO2 values with timestamps
   */
  async getBloodOxygen(startDate: Date, endDate: Date): Promise<Array<{ value: number; timestamp: Date }>> {
    if (!this.isSupported()) return [];
    try {
      const records = await SamsungHealthNative!.readBloodOxygen(
        startDate.getTime(),
        endDate.getTime()
      );
      if (!Array.isArray(records)) return [];
      return records.map((record) => ({
        value: record.value,
        timestamp: new Date(record.timestamp),
      }));
    } catch (error) {
      console.error('[SamsungHealth] getBloodOxygen error:', error);
      return [];
    }
  }

  /**
   * Get blood pressure readings from Samsung Health
   * Returns array of blood pressure measurements with timestamps
   */
  async getBloodPressure(startDate: Date, endDate: Date): Promise<Array<{ systolic: number; diastolic: number; timestamp: Date }>> {
    if (!this.isSupported()) return [];
    try {
      const records = await SamsungHealthNative!.readBloodPressure(
        startDate.getTime(),
        endDate.getTime()
      );
      if (!Array.isArray(records)) return [];
      return records.map((record) => ({
        systolic: record.systolic,
        diastolic: record.diastolic,
        timestamp: new Date(record.timestamp),
      }));
    } catch (error) {
      console.error('[SamsungHealth] getBloodPressure error:', error);
      return [];
    }
  }
}

