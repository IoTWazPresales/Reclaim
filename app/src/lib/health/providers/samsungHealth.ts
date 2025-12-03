import { NativeModules, Platform, Alert } from 'react-native';

import type {
  HealthDataProvider,
  HealthMetric,
  HealthPlatform,
  HeartRateSample,
  SleepSession,
  ActivitySample,
  StressLevel,
  SleepStageSegment,
} from '../types';
import { logger } from '@/lib/logger';

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

/**
 * Samsung Health SDK Error Codes (from official SDK)
 * Per: https://developer.samsung.com/health/data/api-reference/-shd/com.samsung.android.sdk.health.data.error/index.html
 */
enum SamsungHealthErrorCode {
  ERR_PLATFORM_NOT_INSTALLED = 'ERR_PLATFORM_NOT_INSTALLED',
  ERR_OLD_VERSION_PLATFORM = 'ERR_OLD_VERSION_PLATFORM',
  ERR_PLATFORM_DISABLED = 'ERR_PLATFORM_DISABLED',
  ERR_PLATFORM_NOT_INITIALIZED = 'ERR_PLATFORM_NOT_INITIALIZED',
}

function pick<T extends Function>(obj: any, keys: string[]): T | undefined {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === 'function') return v as T;
  }
  return undefined;
}

/**
 * Build adapter for react-native-samsung-health-android package
 * This package wraps the official Samsung Health Data SDK
 * Per Samsung docs: https://developer.samsung.com/health/data/guide/hello-sdk/health-data-store.html
 */
function buildSamsungNativeShim() {
  // react-native-samsung-health-android exports as SamsungHealthAndroid
  const mod = (NativeModules as any)?.SamsungHealthAndroid;
  
  if (!mod || typeof mod !== 'object') {
    if (__DEV__) {
      logger.debug('[SamsungHealth] Native module SamsungHealthAndroid not found');
      logger.debug('[SamsungHealth] Available modules:', Object.keys(NativeModules));
    }
    return undefined;
  }
  
  // Log available methods for debugging
  if (__DEV__) {
    const availableMethods = Object.keys(mod).filter(k => typeof mod[k] === 'function');
    logger.debug('[SamsungHealth] Native module detected:', {
      moduleExists: !!mod,
      availableMethods,
    });
  }
  
  // Check for required methods based on react-native-samsung-health-android API
  const hasAskPermission = typeof mod.askPermissionAsync === 'function';
  const hasGetPermission = typeof mod.getPermissionAsync === 'function';
  const hasReadData = typeof mod.readDataAsync === 'function';
  const hasGetStepCount = typeof mod.getStepCountDailie === 'function';
  
  if (!hasAskPermission && !hasGetPermission) {
    logger.warn('[SamsungHealth] Required permission methods not found');
    return undefined;
  }
  
  // Create adapter functions following Samsung SDK patterns
  // Per docs: https://developer.samsung.com/health/data/guide/hello-sdk/permission-request.html
  return {
    /**
     * Check if Samsung Health is available
     * Per Samsung docs: Use getGrantedPermissions() to check availability
     * If it throws ResolvablePlatformException, app is not installed/available
     */
    isAvailable: async (): Promise<boolean> => {
      try {
        // Try to check permissions - if SDK is available, this will work
        // If app is not installed, this will throw an error
        if (hasGetPermission) {
          try {
            await mod.getPermissionAsync();
            return true; // If no error, SDK is available
          } catch (error: any) {
            // Check for specific Samsung SDK error codes
            const errorCode = error?.code || error?.errorCode || error?.message || '';
            if (errorCode.includes('NOT_INSTALLED') || errorCode.includes('PLATFORM_NOT_INSTALLED')) {
              logger.debug('[SamsungHealth] App not installed');
              return false;
            }
            if (errorCode.includes('OLD_VERSION') || errorCode.includes('OLD_VERSION_PLATFORM')) {
              logger.debug('[SamsungHealth] App version too old');
              return false;
            }
            if (errorCode.includes('DISABLED') || errorCode.includes('PLATFORM_DISABLED')) {
              logger.debug('[SamsungHealth] App disabled');
              return false;
            }
            if (errorCode.includes('NOT_INITIALIZED') || errorCode.includes('PLATFORM_NOT_INITIALIZED')) {
              logger.debug('[SamsungHealth] App not initialized (user needs to complete setup)');
              return false;
            }
            // Other errors might mean SDK is available but permissions not granted
            // Return true to allow permission request to proceed
            return true;
          }
        }
        
        // Fallback: try a simple read operation to check availability
        if (hasGetStepCount) {
          try {
            const now = Date.now();
            const oneDayAgo = now - 24 * 60 * 60 * 1000;
            await mod.getStepCountDailie({
              startDate: oneDayAgo.toString(),
              endDate: now.toString(),
            });
            return true;
          } catch (error: any) {
            const errorCode = error?.code || error?.errorCode || error?.message || '';
            // If error indicates app not installed, return false
            if (errorCode.includes('NOT_INSTALLED') || errorCode.includes('PLATFORM_NOT_INSTALLED')) {
              return false;
            }
            // Other errors might mean permissions not granted, but SDK is available
            return true;
          }
        }
        
        // If we have the module but can't check, assume available
        return true;
      } catch (error: any) {
        logger.warn('[SamsungHealth] isAvailable error:', error?.message || error);
        return false;
      }
    },
    
    /**
     * Request permissions
     * Per Samsung docs: https://developer.samsung.com/health/data/guide/hello-sdk/permission-request.html
     * Uses requestPermissions() which shows the permission dialog
     */
    askPermission: async (): Promise<boolean> => {
      try {
        if (hasAskPermission) {
          const result = await mod.askPermissionAsync();
          // Handle different response formats
          if (result === true) return true;
          if (typeof result === 'object' && result?.success === true) return true;
          if (typeof result === 'object' && result?.granted === true) return true;
          if (Array.isArray(result) && result.length > 0) {
            // Check if all permissions were granted
            return result.every((perm: any) => 
              perm === true || 
              perm?.granted === true || 
              perm?.success === true
            );
          }
          return false;
        }
        
        logger.warn('[SamsungHealth] askPermissionAsync not available');
        return false;
      } catch (error: any) {
        const errorCode = error?.code || error?.errorCode || error?.message || '';
        
        // Handle Samsung SDK specific errors
        if (errorCode.includes('NOT_INSTALLED') || errorCode.includes('PLATFORM_NOT_INSTALLED')) {
          logger.error('[SamsungHealth] App not installed');
          Alert.alert(
            'Samsung Health Not Found',
            'Samsung Health app is not installed. Please install it from the Galaxy Store or Google Play Store.'
          );
          return false;
        }
        
        if (errorCode.includes('OLD_VERSION') || errorCode.includes('OLD_VERSION_PLATFORM')) {
          logger.error('[SamsungHealth] App version too old');
          Alert.alert(
            'Samsung Health Update Required',
            'Please update Samsung Health to the latest version from the Galaxy Store or Google Play Store.'
          );
          return false;
        }
        
        if (errorCode.includes('DISABLED') || errorCode.includes('PLATFORM_DISABLED')) {
          logger.error('[SamsungHealth] App disabled');
          Alert.alert(
            'Samsung Health Disabled',
            'Samsung Health is disabled. Please enable it in your device settings.'
          );
          return false;
        }
        
        if (errorCode.includes('NOT_INITIALIZED') || errorCode.includes('PLATFORM_NOT_INITIALIZED')) {
          logger.error('[SamsungHealth] App not initialized');
          Alert.alert(
            'Samsung Health Setup Required',
            'Please open Samsung Health app and complete the initial setup (agree to Terms and Conditions).'
          );
          return false;
        }
        
        logger.error('[SamsungHealth] askPermission error:', error?.message || error);
        return false;
      }
    },
    
    /**
     * Check if permissions are granted
     * Per Samsung docs: Use getGrantedPermissions() to check current permissions
     */
    getPermission: async (): Promise<boolean> => {
      try {
        if (hasGetPermission) {
          const result = await mod.getPermissionAsync();
          if (result === true) return true;
          if (typeof result === 'object' && result?.granted === true) return true;
          if (Array.isArray(result) && result.length > 0) {
            // Check if any permissions were granted
            return result.some((perm: any) => 
              perm === true || 
              perm?.granted === true
            );
          }
          return false;
        }
        
        // Fallback: try a simple read to check if permissions are granted
        if (hasGetStepCount) {
          try {
            const now = Date.now();
            const oneDayAgo = now - 24 * 60 * 60 * 1000;
            await mod.getStepCountDailie({
              startDate: oneDayAgo.toString(),
              endDate: now.toString(),
            });
            return true; // If read succeeds, permissions are granted
          } catch {
            return false; // If read fails, permissions not granted
          }
        }
        
        return false;
      } catch (error: any) {
        logger.debug('[SamsungHealth] getPermission error:', error?.message || error);
        return false;
      }
    },
    
    readDailySteps: async (start: number, end: number): Promise<NativeStepResponse> => {
      if (!hasGetStepCount) {
        logger.warn('[SamsungHealth] getStepCountDailie not available');
        return { total: 0, segments: [] };
      }
      
      try {
        const result = await mod.getStepCountDailie({
          startDate: start.toString(),
          endDate: end.toString(),
        });
        
        // Adapt the response format
        if (Array.isArray(result)) {
          const total = result.reduce((sum: number, item: any) => sum + (item.count || 0), 0);
          return {
            total,
            segments: result.map((item: any) => ({
              value: item.count || 0,
              start: item.day_time || start,
              end: item.day_time || end,
            })),
          };
        }
        
        // Handle numeric response
        if (typeof result === 'number') {
          return { total: result, segments: [] };
        }
        
        // Handle object response
        if (typeof result === 'object' && result !== null) {
          return {
            total: result.total || result.count || 0,
            segments: result.segments || result.items || [],
          };
        }
        
        return { total: 0, segments: [] };
      } catch (error: any) {
        logger.error('[SamsungHealth] readDailySteps error:', error?.message || error);
        return { total: 0, segments: [] };
      }
    },
    
    readSleepSessions: async (start: number, end: number): Promise<NativeSleepSession[]> => {
      if (!hasReadData) {
        logger.warn('[SamsungHealth] readDataAsync not available');
        return [];
      }
      
      try {
        // Create metric for Sleep data type
        // Per Samsung SDK: Use DataTypes.SLEEP for sleep sessions
        const sleepMetric = mod.createMetric ? mod.createMetric({
          type: mod.Types?.Sleep || 'com.samsung.health.sleep',
          start,
          end,
        }) : { type: 'sleep', start, end };
        
        const sleepResults = await mod.readDataAsync(sleepMetric);
        
        if (!Array.isArray(sleepResults) || sleepResults.length === 0) {
          return [];
        }
        
        // For each sleep session, also fetch sleep stages and body temperature
        const sessionsWithDetails = await Promise.all(
          sleepResults.map(async (sleepItem: any) => {
            const sleepId = sleepItem.sleep_id || sleepItem.uid;
            const sessionStart = sleepItem.start_time || sleepItem.start || start;
            const sessionEnd = sleepItem.end_time || sleepItem.end || end;
            
            // Fetch sleep stages for this session
            let stages: any[] = [];
            try {
              if (hasReadData && mod.createMetric) {
                const stageMetric = mod.createMetric({
                  type: mod.Types?.SleepStage || 'com.samsung.health.sleep_stage',
                  start: sessionStart,
                  end: sessionEnd,
                });
                const stageResults = await mod.readDataAsync(stageMetric);
                if (Array.isArray(stageResults)) {
                  // Filter stages for this specific sleep session
                  stages = stageResults.filter((s: any) => s.sleep_id === sleepId || s.uid === sleepId);
                }
              }
            } catch (stageError: any) {
              logger.warn('[SamsungHealth] Error fetching sleep stages:', stageError?.message || stageError);
            }
            
            // Fetch body temperature during sleep (if available)
            let bodyTemperature: number | undefined = undefined;
            try {
              if (hasReadData && mod.createMetric) {
                const tempMetric = mod.createMetric({
                  type: mod.Types?.BodyTemperature || 'com.samsung.health.body_temperature',
                  start: sessionStart,
                  end: sessionEnd,
                });
                const tempResults = await mod.readDataAsync(tempMetric);
                if (Array.isArray(tempResults) && tempResults.length > 0) {
                  // Get average temperature during sleep
                  const temps = tempResults
                    .map((t: any) => t.temperature || t.value)
                    .filter((t: any) => typeof t === 'number');
                  if (temps.length > 0) {
                    bodyTemperature = temps.reduce((sum: number, t: number) => sum + t, 0) / temps.length;
                  }
                }
              }
            } catch (tempError: any) {
              logger.warn('[SamsungHealth] Error fetching body temperature:', tempError?.message || tempError);
            }
            
            // Calculate stage durations
            const deepSleep = stages
              .filter((s: any) => s.stage === 'deep' || s.stage === '3' || s.stage === '4')
              .reduce((sum: number, s: any) => {
                const duration = ((s.end_time || sessionEnd) - (s.start_time || sessionStart)) / 60000;
                return sum + duration;
              }, 0);
            
            const remSleep = stages
              .filter((s: any) => s.stage === 'rem' || s.stage?.toLowerCase().includes('rem'))
              .reduce((sum: number, s: any) => {
                const duration = ((s.end_time || sessionEnd) - (s.start_time || sessionStart)) / 60000;
                return sum + duration;
              }, 0);
            
            const lightSleep = stages
              .filter((s: any) => s.stage === 'light' || s.stage === '1' || s.stage === '2')
              .reduce((sum: number, s: any) => {
                const duration = ((s.end_time || sessionEnd) - (s.start_time || sessionStart)) / 60000;
                return sum + duration;
              }, 0);
            
            const awake = stages
              .filter((s: any) => s.stage === 'awake' || s.stage === '0' || s.stage?.toLowerCase().includes('wake'))
              .reduce((sum: number, s: any) => {
                const duration = ((s.end_time || sessionEnd) - (s.start_time || sessionStart)) / 60000;
                return sum + duration;
              }, 0);
            
            return {
              start: sessionStart,
              end: sessionEnd,
              uid: sleepId,
              state: sleepItem.custom || sleepItem.state || null,
              stages: stages.map((s: any) => ({
                start: s.start_time || sessionStart,
                end: s.end_time || sessionEnd,
                stage: s.stage || s.type || s.stageType,
              })),
              deepSleep: Math.round(deepSleep),
              remSleep: Math.round(remSleep),
              lightSleep: Math.round(lightSleep),
              awake: Math.round(awake),
              bodyTemperature,
              efficiency: sleepItem.comment ? parseFloat(sleepItem.comment) : sleepItem.efficiency,
            };
          })
        );
        
        return sessionsWithDetails;
      } catch (error: any) {
        logger.error('[SamsungHealth] readSleepSessions error:', error?.message || error);
        return [];
      }
    },
    
    readHeartRate: async (start: number, end: number): Promise<NativeHeartRate[]> => {
      if (!hasReadData) {
        logger.warn('[SamsungHealth] readDataAsync not available');
        return [];
      }
      
      try {
        const metric = mod.createMetric ? mod.createMetric({
          type: mod.Types?.HeartRate || 'com.samsung.health.heart_rate',
          start,
          end,
        }) : { type: 'heart_rate', start, end };
        
        const result = await mod.readDataAsync(metric);
        return Array.isArray(result)
          ? result.map((item: any) => ({
              value: item.heart_rate || item.min || item.value || 0,
              timestamp: item.update_time || item.time || item.timestamp || start,
            }))
          : [];
      } catch (error: any) {
        logger.error('[SamsungHealth] readHeartRate error:', error?.message || error);
        return [];
      }
    },
    
    readBloodOxygen: async (start: number, end: number): Promise<Array<{ value: number; timestamp: number }>> => {
      if (!hasReadData) {
        return [];
      }
      
      try {
        const metric = mod.createMetric ? mod.createMetric({
          type: mod.Types?.OxygenSaturation || 'com.samsung.health.oxygen_saturation',
          start,
          end,
        }) : { type: 'oxygen_saturation', start, end };
        
        const result = await mod.readDataAsync(metric);
        return Array.isArray(result)
          ? result.map((item: any) => ({
              value: item.spo2 || item.oxygen_saturation || item.value || 0,
              timestamp: item.update_time || item.start_time || item.time || start,
            }))
          : [];
      } catch (error: any) {
        logger.error('[SamsungHealth] readBloodOxygen error:', error?.message || error);
        return [];
      }
    },
    
    readBloodPressure: async (start: number, end: number): Promise<Array<{ systolic: number; diastolic: number; timestamp: number }>> => {
      if (!hasReadData) {
        return [];
      }
      
      try {
        const metric = mod.createMetric ? mod.createMetric({
          type: mod.Types?.BloodPressure || 'com.samsung.health.blood_pressure',
          start,
          end,
        }) : { type: 'blood_pressure', start, end };
        
        const result = await mod.readDataAsync(metric);
        return Array.isArray(result)
          ? result.map((item: any) => ({
              systolic: item.systolic || item.sbp || 0,
              diastolic: item.diastolic || item.dbp || 0,
              timestamp: item.update_time || item.start_time || item.time || start,
            }))
          : [];
      } catch (error: any) {
        logger.error('[SamsungHealth] readBloodPressure error:', error?.message || error);
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

  /**
   * Check if Samsung Health is available
   * Per Samsung docs: https://developer.samsung.com/health/data/guide/hello-sdk/app-module.html
   */
  async isAvailable(): Promise<boolean> {
    if (!this.isSupported()) {
      logger.debug('[SamsungHealth] Not supported: Platform is not Android or native module not found');
      return false;
    }
    
    if (!SamsungHealthNative) {
      logger.debug('[SamsungHealth] Native module not found - react-native-samsung-health-android may not be properly linked');
      return false;
    }
    
    try {
      const available = await SamsungHealthNative.isAvailable();
      logger.debug(`[SamsungHealth] isAvailable check result: ${available}`);
      return available === true;
    } catch (error: any) {
      logger.error('[SamsungHealth] isAvailable error:', error?.message ?? error);
      return false;
    }
  }

  /**
   * Request permissions for health data
   * Per Samsung docs: https://developer.samsung.com/health/data/guide/hello-sdk/permission-request.html
   * 
   * Pattern:
   * 1. Check if app is available
   * 2. Check current granted permissions
   * 3. Request permissions if not all granted
   * 4. Handle ResolvablePlatformException with error codes
   */
  async requestPermissions(_: HealthMetric[]): Promise<boolean> {
    if (!this.isSupported()) {
      logger.warn('[SamsungHealth] Not supported on this platform');
      return false;
    }
    
    if (!SamsungHealthNative) {
      logger.error('[SamsungHealth] Native module not available - cannot request permissions');
      Alert.alert(
        'Samsung Health SDK Error',
        'Samsung Health SDK is not properly configured. Please ensure:\n\n1. App is built with a development build (not Expo Go)\n2. react-native-samsung-health-android package is installed\n3. App is rebuilt after package installation'
      );
      return false;
    }
    
    try {
      // Step 1: Check if Samsung Health app is available
      // Per Samsung docs: This can throw ResolvablePlatformException
      const available = await SamsungHealthNative.isAvailable();
      logger.debug('[SamsungHealth] Availability check:', available);
      
      if (!available) {
        logger.warn('[SamsungHealth] Samsung Health app not available');
        Alert.alert(
          'Samsung Health Not Found',
          'Samsung Health app is not installed or not available.\n\nPlease:\n1. Install Samsung Health from Galaxy Store or Google Play\n2. Open Samsung Health and complete initial setup\n3. Ensure your device is a Samsung device'
        );
        return false;
      }
      
      // Step 2: Check if we already have permissions
      // Per Samsung docs: Use getGrantedPermissions() to check
      let hasPermission = false;
      try {
        hasPermission = await SamsungHealthNative.getPermission();
        logger.debug('[SamsungHealth] Permission check:', hasPermission);
      } catch (permCheckError: any) {
        logger.debug('[SamsungHealth] Permission check failed, will request:', permCheckError?.message ?? permCheckError);
        // Continue to request permissions even if check fails
      }
      
      if (hasPermission) {
        logger.debug('[SamsungHealth] Already has permissions');
        return true;
      }
      
      // Step 3: Request permissions
      // Per Samsung docs: Use requestPermissions() which shows permission dialog
      logger.debug('[SamsungHealth] Requesting permissions...');
      const granted = await SamsungHealthNative.askPermission();
      logger.debug('[SamsungHealth] Permission request result:', granted);
      
      if (granted) {
        logger.info('[SamsungHealth] Permissions granted');
        return true;
      } else {
        logger.warn('[SamsungHealth] Permissions denied by user');
        return false;
      }
    } catch (error: any) {
      logger.error('[SamsungHealth] requestPermissions error:', error?.message ?? error);
      logger.error('[SamsungHealth] Error details:', {
        name: error?.name,
        code: error?.code,
        stack: error?.stack?.substring(0, 500),
      });
      
      // Show user-friendly error message
      Alert.alert(
        'Samsung Health Error',
        error?.message || 'Failed to request permissions from Samsung Health. Please try again.'
      );
      
      return false;
    }
  }

  async hasPermissions(_: HealthMetric[]): Promise<boolean> {
    if (!this.isSupported() || !SamsungHealthNative) return false;
    
    try {
      const available = await SamsungHealthNative.isAvailable();
      if (!available) return false;
      
      return await SamsungHealthNative.getPermission();
    } catch {
      return false;
    }
  }

  async getHeartRate(startDate: Date, endDate: Date): Promise<HeartRateSample[]> {
    if (!this.isSupported() || !SamsungHealthNative) return [];
    
    try {
      const records = await SamsungHealthNative.readHeartRate(
        startDate.getTime(),
        endDate.getTime()
      );
      if (!Array.isArray(records)) return [];
      return records.map((record) => ({
        value: record.value,
        timestamp: new Date(record.timestamp),
        source: 'samsung_health',
      }));
    } catch (error: any) {
      logger.error('[SamsungHealth] getHeartRate error:', error?.message || error);
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
    if (!this.isSupported() || !SamsungHealthNative) {
      logger.warn('[SamsungHealth] Not supported on this platform');
      return [];
    }
    
    try {
      logger.debug('[SamsungHealth] Fetching sleep sessions', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      
      const sessions = await SamsungHealthNative.readSleepSessions(
        startDate.getTime(),
        endDate.getTime()
      );
      
      logger.debug('[SamsungHealth] Received sleep sessions', {
        count: Array.isArray(sessions) ? sessions.length : 0,
      });
      
      if (!Array.isArray(sessions)) {
        logger.warn('[SamsungHealth] Sleep sessions response is not an array');
        return [];
      }
      
      return await Promise.all(
        sessions.map(async (session: any): Promise<SleepSession> => {
          const startTime = new Date(session.start);
          const endTime = new Date(session.end);
          const durationMinutes = Math.round((session.end - session.start) / 60000);
          
          // Parse sleep stages from native response
          let stages: SleepStageSegment[] | undefined = undefined;
          
          if (session.stages && Array.isArray(session.stages) && session.stages.length > 0) {
            stages = session.stages.map((s: any) => ({
              start: new Date(s.start || s.startTime || session.start),
              end: new Date(s.end || s.endTime || s.start || session.end),
              stage: this.mapSleepStage(s.stage || s.type || s.stageType) as any,
            }));
          } else if (session.deepSleep || session.remSleep || session.lightSleep || session.awake) {
            // Reconstruct stages from duration aggregates (simplified)
            stages = [];
            let currentTime = startTime.getTime();
            const deepMinutes = session.deepSleep || 0;
            const remMinutes = session.remSleep || 0;
            const lightMinutes = session.lightSleep || 0;
            const awakeMinutes = session.awake || 0;
            
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
          
          return {
            startTime,
            endTime,
            durationMinutes,
            efficiency: typeof session.efficiency === 'number' ? session.efficiency : undefined,
            stages: stages && stages.length > 0 ? stages : undefined,
            source: 'samsung_health',
            metadata: {
              avgHeartRate: session.avgHeartRate,
              minHeartRate: session.minHeartRate,
              maxHeartRate: session.maxHeartRate,
              bodyTemperature: session.bodyTemperature,
              skinTemperature: session.bodyTemperature,
              deepSleepMinutes: session.deepSleep,
              remSleepMinutes: session.remSleep,
              lightSleepMinutes: session.lightSleep,
              awakeMinutes: session.awake,
            } as any,
          };
        })
      );
    } catch (error: any) {
      logger.error('[SamsungHealth] getSleepSessions error:', error?.message || error);
      logger.error('[SamsungHealth] Error details:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack?.substring(0, 500),
        name: error?.name,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
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
    if (!this.isSupported() || !SamsungHealthNative) return null;
    
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const stepResponse = await SamsungHealthNative.readDailySteps(
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
    } catch (error: any) {
      logger.error('[SamsungHealth] getTodayActivity error:', error?.message || error);
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
   */
  async getBloodOxygen(startDate: Date, endDate: Date): Promise<Array<{ value: number; timestamp: Date }>> {
    if (!this.isSupported() || !SamsungHealthNative) return [];
    
    try {
      const records = await SamsungHealthNative.readBloodOxygen(
        startDate.getTime(),
        endDate.getTime()
      );
      if (!Array.isArray(records)) return [];
      return records.map((record) => ({
        value: record.value,
        timestamp: new Date(record.timestamp),
      }));
    } catch (error: any) {
      logger.error('[SamsungHealth] getBloodOxygen error:', error?.message || error);
      return [];
    }
  }

  /**
   * Get blood pressure readings from Samsung Health
   */
  async getBloodPressure(startDate: Date, endDate: Date): Promise<Array<{ systolic: number; diastolic: number; timestamp: Date }>> {
    if (!this.isSupported() || !SamsungHealthNative) return [];
    
    try {
      const records = await SamsungHealthNative.readBloodPressure(
        startDate.getTime(),
        endDate.getTime()
      );
      if (!Array.isArray(records)) return [];
      return records.map((record) => ({
        systolic: record.systolic,
        diastolic: record.diastolic,
        timestamp: new Date(record.timestamp),
      }));
    } catch (error: any) {
      logger.error('[SamsungHealth] getBloodPressure error:', error?.message || error);
      return [];
    }
  }
}
