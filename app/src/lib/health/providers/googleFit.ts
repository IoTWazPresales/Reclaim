/**
 * Google Fit Provider
 * Enhanced implementation with real-time monitoring support
 */
import { Platform, Alert, PermissionsAndroid } from 'react-native';
import GoogleFit, { Scopes } from 'react-native-google-fit';
import type { HealthDataProvider, HeartRateSample, SleepSession, StressLevel, ActivitySample, HealthMetric } from '../types';

export class GoogleFitProvider implements HealthDataProvider {
  platform = 'google_fit' as const;
  private authorized = false;
  private heartRateSubscribers: Set<(sample: HeartRateSample) => void> = new Set();
  private stressSubscribers: Set<(level: StressLevel) => void> = new Set();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly module = GoogleFit as any;
  private permissionRequestInProgress = false; // Guard against multiple simultaneous requests

  async isAvailable(): Promise<boolean> {
    // Google Fit is available on Android
    // Note: Google Fit automatically aggregates data from Samsung Health if the user
    // has Google Fit installed and Samsung Health is syncing to it
    return Platform.OS === 'android';
  }

  async hasPermissions(metrics: HealthMetric[]): Promise<boolean> {
    if (!(await this.isAvailable())) return false;

    if (this.authorized) {
      return true;
    }

    // Prefer the lightweight authorization check supplied by the library.
    try {
      const result = await this.module.checkIsAuthorized?.();
      if (result && typeof result === 'object' && 'authorized' in result) {
        this.authorized = !!result.authorized;
        return this.authorized;
      }
    } catch (err) {
      // Library throws when Google Fit app / Play Services are missing.
      this.authorized = false;
      return false;
    }

    // Fallback: assume not authorized if we couldn't verify.
    this.authorized = false;
    return false;
  }

  async requestPermissions(metrics: HealthMetric[]): Promise<boolean> {
    if (!(await this.isAvailable())) return false;

    // Step 1: Request Android runtime permission for ACTIVITY_RECOGNITION (required before OAuth)
    // According to Google Fit docs: https://developers.google.com/fit/android/authorization#android_permissions
    if (Platform.OS === 'android') {
      try {
        // Check if we need steps/activity data (requires ACTIVITY_RECOGNITION)
        const needsActivityPermission = 
          metrics.includes('steps') || 
          metrics.includes('active_energy') || 
          metrics.includes('activity_level');

        if (needsActivityPermission) {
          // Prevent multiple simultaneous permission requests
          if (this.permissionRequestInProgress) {
            console.log('GoogleFit: Permission request already in progress, skipping duplicate request');
            return false;
          }

          // Android 10+ (API 29+) uses ACTIVITY_RECOGNITION
          // Android 9 and below uses different permission, but we target API 29+
          // Safety check: ACTIVITY_RECOGNITION might not be available on all builds
          const permission = PermissionsAndroid.PERMISSIONS?.ACTIVITY_RECOGNITION;
          
          if (!permission) {
            console.warn('GoogleFit: ACTIVITY_RECOGNITION permission not available in PermissionsAndroid.PERMISSIONS');
            // Continue to OAuth - some devices/builds might handle this differently
          } else {
            try {
              const hasPermission = await PermissionsAndroid.check(permission);
              
              if (!hasPermission) {
                this.permissionRequestInProgress = true;
                console.log('GoogleFit: Requesting Android ACTIVITY_RECOGNITION permission');
                try {
                  const result = await PermissionsAndroid.request(permission, {
                    title: 'Activity Recognition Permission',
                    message: 'Reclaim needs permission to access your activity data (steps, calories) from Google Fit.',
                    buttonNeutral: 'Ask Me Later',
                    buttonNegative: 'Cancel',
                    buttonPositive: 'OK',
                  });

                  if (result !== PermissionsAndroid.RESULTS.GRANTED) {
                    console.warn('GoogleFit: ACTIVITY_RECOGNITION permission denied');
                    Alert.alert(
                      'Permission Required',
                      'Activity recognition permission is required to access steps and activity data from Google Fit. Please grant this permission in app settings.'
                    );
                    return false;
                  }
                  
                  console.log('GoogleFit: ACTIVITY_RECOGNITION permission granted');
                } finally {
                  this.permissionRequestInProgress = false;
                }
              }
            } catch (checkError: any) {
              this.permissionRequestInProgress = false;
              console.warn('GoogleFit: Error checking/requesting ACTIVITY_RECOGNITION permission:', checkError);
              // Continue to OAuth - permission might be handled differently on this device
            }
          }
        }
      } catch (permissionError: any) {
        console.error('GoogleFit: Error requesting Android permission:', permissionError);
        // Continue to OAuth request - some devices might handle this differently
        // The OAuth flow will fail if permission is truly required
      }
    }

    // Step 1.5: If we're already authorized, skip OAuth prompt entirely
    try {
      const alreadyAuthorized = await this.hasPermissions(metrics);
      if (alreadyAuthorized) {
        console.log('GoogleFit: Permissions already granted; skipping OAuth flow');
        return true;
      }
    } catch (precheckError) {
      console.warn('GoogleFit: Failed to verify existing authorization before OAuth', precheckError);
    }

    // Step 2: Request OAuth scopes (after Android permission is granted)
    const scopes = [Scopes.FITNESS_SLEEP_READ];
    
    if (metrics.includes('heart_rate') || metrics.includes('resting_heart_rate')) {
      scopes.push(Scopes.FITNESS_HEART_RATE_READ);
    }
    if (metrics.includes('steps') || metrics.includes('active_energy')) {
      scopes.push(Scopes.FITNESS_ACTIVITY_READ);
    }

    try {
      // Check if GoogleFit is initialized
      const module = this.module;
      if (!module || typeof module.authorize !== 'function') {
        console.error('GoogleFit: Not initialized or authorize method not available');
        Alert.alert(
          'Google Fit Setup Required',
          'Google Fit is not properly configured. This requires:\n\n1. Google Fit app installed on device\n2. OAuth2 credentials configured in app.json\n3. Development build (not Expo Go)\n\nPlease use a development build instead of Expo Go.'
        );
        return false;
      }

      console.log('GoogleFit: Requesting OAuth authorization with scopes:', scopes);
      
      // Wrap in try-catch to handle internal library errors
      let auth: any;
      try {
        auth = await module.authorize({ scopes });
      } catch (authError: any) {
        // If authorize throws an error, it might be an internal library issue
        console.error('GoogleFit: authorize() threw an error:', authError);
        
        // Check if it's an initialization issue
        if (authError?.message?.includes('isAuthorized') || authError?.message?.includes('null')) {
          Alert.alert(
            'Google Fit Setup Required',
            'Google Fit requires proper setup:\n\n1. Install Google Fit app\n2. Use a development build (not Expo Go)\n3. Configure OAuth2 credentials\n\nNote: react-native-google-fit does not work in Expo Go. You need a development build.'
          );
        }
        
        this.authorized = false;
        return false;
      }
      
      // Handle different response formats
      let success = auth?.success === true || (typeof auth === 'boolean' && auth === true);
      this.authorized = success;

      if (!success) {
        // Some devices report `Authorization cancelled` even when the user already granted
        // permissions earlier. Double-check authorization state before failing hard so that
        // reconnect flows keep working without forcing a full disconnect.
        try {
          let fallbackAuthorized = false;
          if (typeof module?.checkIsAuthorized === 'function') {
            const check = await module.checkIsAuthorized();
            fallbackAuthorized = !!check?.authorized;
          }
          if (!fallbackAuthorized) {
            if (typeof module?.isAuthorized === 'function') {
              fallbackAuthorized = (await module.isAuthorized()) === true;
            } else if (typeof module?.isAuthorized === 'boolean') {
              fallbackAuthorized = module.isAuthorized;
            }
          }

          if (fallbackAuthorized) {
            console.warn('GoogleFit: Authorization reported cancel but SDK says authorized. Treating as success.');
            success = true;
            this.authorized = true;
          }
        } catch (verifyError) {
          console.warn('GoogleFit: Fallback authorization check failed', verifyError);
        }
      }
      
      if (success) {
        console.log('GoogleFit: Authorization successful');
        // Verify permissions were actually granted
        try {
          const isAuthorized = await module.isAuthorized();
          if (!isAuthorized) {
            console.warn('GoogleFit: Authorization reported success but isAuthorized() returned false');
            this.authorized = false;
            return false;
          }
        } catch (checkError) {
          console.warn('GoogleFit: Could not verify authorization status', checkError);
          // Continue anyway - the authorize call succeeded
        }
      } else {
        console.warn('GoogleFit: Authorization failed', { auth, scopes });
        // Provide user feedback
        if (auth?.message) {
          console.warn('GoogleFit error message:', auth.message);
          // Don't show alert for user cancellation - it's expected behavior
          if (auth.message.toLowerCase().includes('cancelled') || auth.message.toLowerCase().includes('cancel')) {
            if (!success) {
              console.log('GoogleFit: User cancelled authorization - this is expected');
            }
            // Don't show alert for cancellation
          } else {
            Alert.alert('Google Fit Authorization Failed', auth.message);
          }
        } else {
          Alert.alert(
            'Google Fit Authorization Failed',
            'Please ensure Google Fit is installed and try again. If the issue persists, check that OAuth2 credentials are properly configured.'
          );
        }
      }
      
      return success;
    } catch (error: any) {
      console.error('GoogleFit authorization error:', error);
      console.error('GoogleFit error details:', {
        message: error?.message,
        stack: error?.stack,
        error: error,
      });
      
      // Check if it's the known Expo Go limitation
      if (error?.message?.includes('Expo Go') || error?.message?.includes('development build')) {
        Alert.alert(
          'Development Build Required',
          'Google Fit integration requires a development build, not Expo Go. Please build and install a development build of the app.'
        );
      }
      
      this.authorized = false;
      return false;
    }
  }

  async getHeartRate(startDate: Date, endDate: Date): Promise<HeartRateSample[]> {
    if (!this.authorized) return [];

    try {
      const samples = await this.module.getHeartRateSamples?.({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      return (samples || []).map((s: any) => {
        // Identify Samsung Health sources (Google Fit aggregates data from multiple sources)
        const sourceName = (s.sourceName || '').toLowerCase();
        const isSamsungSource = 
          sourceName.includes('samsung') ||
          sourceName.includes('shealth') ||
          sourceName.includes('com.samsung');
        
        return {
          value: s.value,
          timestamp: new Date(s.startDate),
        source: 'google_fit',
        };
      });
    } catch {
      return [];
    }
  }

  async getRestingHeartRate(startDate: Date, endDate: Date): Promise<number | null> {
    // Google Fit doesn't have a direct resting HR endpoint
    // Use average of heart rate samples during sleep/rest periods
    const hrSamples = await this.getHeartRate(startDate, endDate);
    if (hrSamples.length === 0) return null;

    // Filter low heart rate samples (likely resting)
    const restingSamples = hrSamples.filter((s) => s.value < 70);
    if (restingSamples.length === 0) return null;

    const sum = restingSamples.reduce((acc, s) => acc + s.value, 0);
    return Math.round(sum / restingSamples.length);
  }

  async getSleepSessions(startDate: Date, endDate: Date): Promise<SleepSession[]> {
    if (!this.authorized) return [];

    try {
      const samples = await this.module.getSleepSamples?.(
        {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        true
      );

      return (samples || []).map((s: any) => {
        // Identify Samsung Health sources in sleep data
        const sourceName = (s.sourceName || '').toLowerCase();
        const isSamsungSource = 
          sourceName.includes('samsung') ||
          sourceName.includes('shealth') ||
          sourceName.includes('com.samsung');
        
        // Note: Google Fit aggregates data, so Samsung Health data is included
        // The source field indicates the original data source when available
        return {
          startTime: new Date(s.startDate),
          endTime: new Date(s.endDate),
          durationMinutes: Math.round((new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / 60000),
          efficiency: s.efficiency,
          stages: undefined, // Google Fit sleep stages not always available
          source: isSamsungSource ? 'google_fit' as const : 'google_fit' as const, // Google Fit aggregates all sources
        };
      });
    } catch {
      return [];
    }
  }

  async getStressLevel(startDate: Date, endDate: Date): Promise<StressLevel[]> {
    // Google Fit doesn't have direct stress level
    // Infer from heart rate patterns (higher variability = more stress)
    const hrSamples = await this.getHeartRate(startDate, endDate);
    if (hrSamples.length < 3) return [];

    // Calculate HRV-like metric from heart rate variability
    const stresses: StressLevel[] = [];
    for (let i = 1; i < hrSamples.length; i++) {
      const prev = hrSamples[i - 1].value;
      const curr = hrSamples[i].value;
      const diff = Math.abs(curr - prev);
      
      // Higher variability (large changes) suggests stress
      // This is a simplified heuristic
      const stress = Math.min(100, diff * 2);
      stresses.push({
        value: stress,
        timestamp: hrSamples[i].timestamp,
        source: 'inferred_from_hr_variability',
      });
    }

    return stresses;
  }

  async getActivity(startDate: Date, endDate: Date): Promise<ActivitySample[]> {
    if (!this.authorized) return [];

    try {
      const [stepsData, energyData] = await Promise.all([
        this.module.getDailyStepCountSamples?.({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
        this.module.getDailyCalorieSamples?.({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }).catch(() => []),
      ]);

      const samples: ActivitySample[] = [];
      const dayMap = new Map<string, ActivitySample>();

      // Google Fit aggregates data from multiple sources including Samsung Health
      (stepsData || []).forEach((s: any) => {
        const date = new Date(s.date).toISOString().split('T')[0];
        const sourceName = (s.sourceName || '').toLowerCase();
        const isSamsungSource = 
          sourceName.includes('samsung') ||
          sourceName.includes('shealth') ||
          sourceName.includes('com.samsung');
        
        dayMap.set(date, {
          timestamp: new Date(s.date),
          steps: s.steps || 0,
        source: 'google_fit',
        });
      });

      (energyData || []).forEach((e: any) => {
        const date = new Date(e.date).toISOString().split('T')[0];
        if (!dayMap.has(date)) {
          dayMap.set(date, { timestamp: new Date(e.date), source: 'google_fit' });
        }
        dayMap.get(date)!.activeEnergyBurned = e.calorie || 0;
      });

      return Array.from(dayMap.values());
    } catch {
      return [];
    }
  }

  subscribeToHeartRate(callback: (sample: HeartRateSample) => void): () => void {
    this.heartRateSubscribers.add(callback);
    this.startMonitoringIfNeeded();

    return () => {
      this.heartRateSubscribers.delete(callback);
      this.stopMonitoringIfNeeded();
    };
  }

  subscribeToStressLevel(callback: (level: StressLevel) => void): () => void {
    this.stressSubscribers.add(callback);
    this.startMonitoringIfNeeded();

    return () => {
      this.stressSubscribers.delete(callback);
      this.stopMonitoringIfNeeded();
    };
  }

  private startMonitoringIfNeeded() {
    if (this.monitoringInterval || (!this.heartRateSubscribers.size && !this.stressSubscribers.size)) {
      return;
    }

    this.monitoringInterval = setInterval(async () => {
      if (!this.authorized) return;

      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60000);

      const hrSamples = await this.getHeartRate(oneMinuteAgo, now);
      if (hrSamples.length > 0 && this.heartRateSubscribers.size > 0) {
        const latest = hrSamples[hrSamples.length - 1];
        this.heartRateSubscribers.forEach((cb) => cb(latest));
      }

      const stressLevels = await this.getStressLevel(oneMinuteAgo, now);
      if (stressLevels.length > 0 && this.stressSubscribers.size > 0) {
        const latest = stressLevels[stressLevels.length - 1];
        this.stressSubscribers.forEach((cb) => cb(latest));
      }
    }, 60000);
  }

  private stopMonitoringIfNeeded() {
    if (this.heartRateSubscribers.size === 0 && this.stressSubscribers.size === 0) {
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
        this.monitoringInterval = null;
      }
    }
  }
}

