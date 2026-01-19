/**
 * Apple HealthKit Provider
 * Enhanced implementation with real-time monitoring support
 */
import { Platform } from 'react-native';
import AppleHealthKit, { HealthKitPermissions } from 'react-native-health';
import type { HealthDataProvider, HeartRateSample, SleepSession, StressLevel, ActivitySample, HealthMetric } from '../types';

export class AppleHealthKitProvider implements HealthDataProvider {
  platform = 'apple_healthkit' as const;
  private initialized = false;
  private heartRateSubscribers: Set<(sample: HeartRateSample) => void> = new Set();
  private stressSubscribers: Set<(level: StressLevel) => void> = new Set();
  private monitoringInterval: NodeJS.Timeout | null = null;

  async isAvailable(): Promise<boolean> {
    return Platform.OS === 'ios';
  }

  async hasPermissions(metrics: HealthMetric[]): Promise<boolean> {
    if (!(await this.isAvailable())) return false;
    
    // If initialized, permissions are granted
    // Note: This is a simple check - the actual permission status is checked
    // when trying to read data. If not initialized, we need to request permissions.
    return this.initialized;
  }

  async requestPermissions(metrics: HealthMetric[]): Promise<boolean> {
    if (!(await this.isAvailable())) return false;

    const readPerms: string[] = [];
    
    if (metrics.includes('heart_rate') || metrics.includes('resting_heart_rate')) {
      readPerms.push(AppleHealthKit.Constants.Permissions.HeartRate);
    }
    if (metrics.includes('heart_rate_variability')) {
      readPerms.push(AppleHealthKit.Constants.Permissions.HeartRateVariability);
    }
    if (metrics.includes('sleep_analysis') || metrics.includes('sleep_stages')) {
      readPerms.push(AppleHealthKit.Constants.Permissions.SleepAnalysis);
    }
    if (metrics.includes('steps') || metrics.includes('active_energy')) {
      readPerms.push(
        AppleHealthKit.Constants.Permissions.StepCount,
        AppleHealthKit.Constants.Permissions.ActiveEnergyBurned
      );
    }

    const perms: HealthKitPermissions = {
      permissions: {
        read: readPerms as any,
        write: [], // Required even if empty
      },
    };

    return new Promise((resolve) => {
      AppleHealthKit.initHealthKit(perms, (err) => {
        this.initialized = !err;
        resolve(!err);
      });
    });
  }

  async getHeartRate(startDate: Date, endDate: Date): Promise<HeartRateSample[]> {
    if (!this.initialized) return [];

    return new Promise((resolve) => {
      AppleHealthKit.getHeartRateSamples(
        {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        (err, results) => {
          if (err || !results) {
            resolve([]);
            return;
          }
          resolve(
            results.map((r: any) => ({
              value: r.value,
              timestamp: new Date(r.startDate),
              source: r.sourceName,
            }))
          );
        }
      );
    });
  }

  async getRestingHeartRate(startDate: Date, endDate: Date): Promise<number | null> {
    if (!this.initialized) return null;

    return new Promise((resolve) => {
      AppleHealthKit.getRestingHeartRate(
        {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        (err, results) => {
          if (err || !results) {
            resolve(null);
            return;
          }
          // Handle both single value and array responses
          const values = Array.isArray(results) ? results : [results];
          if (values.length === 0) {
            resolve(null);
            return;
          }
          // Get most recent resting heart rate
          const sorted = values.sort(
            (a: any, b: any) => new Date(b.startDate || b.date || 0).getTime() - new Date(a.startDate || a.date || 0).getTime()
          );
          resolve(sorted[0].value);
        }
      );
    });
  }

  async getSleepSessions(startDate: Date, endDate: Date): Promise<SleepSession[]> {
    if (!this.initialized) return [];

    return new Promise((resolve) => {
      AppleHealthKit.getSleepSamples(
        {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        (err, results) => {
          if (err || !results) {
            resolve([]);
            return;
          }
          resolve(
            results.map((r: any) => ({
              startTime: new Date(r.startDate),
              endTime: new Date(r.endDate),
              durationMinutes: Math.round((new Date(r.endDate).getTime() - new Date(r.startDate).getTime()) / 60000),
              efficiency: r.efficiency,
              stages: r.stages?.map((s: any) => ({
                start: new Date(s.startDate),
                end: new Date(s.endDate),
                stage: this.mapSleepType(r.value) as any,
              })),
              source: 'apple_healthkit',
            }))
          );
        }
      );
    });
  }

  async getStressLevel(startDate: Date, endDate: Date): Promise<StressLevel[]> {
    // Apple HealthKit doesn't have direct stress level
    // We can infer from HRV (lower HRV = higher stress typically)
    if (!this.initialized) return [];

    try {
      const hrvSamples = await new Promise<any[]>((resolve) => {
        AppleHealthKit.getHeartRateVariabilitySamples(
          {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
          (err, results) => {
            resolve(err || !results ? [] : results);
          }
        );
      });

      // Convert HRV to stress (inverse relationship - lower HRV = higher stress)
      // This is a simplified heuristic
      return hrvSamples.map((r: any) => {
        const hrv = r.value; // ms
        // Normal HRV ranges 20-100ms, map inversely to stress 0-100
        const stress = Math.max(0, Math.min(100, 100 - ((hrv - 20) / 80) * 100));
        return {
          value: stress,
          timestamp: new Date(r.startDate),
          source: 'inferred_from_hrv',
        };
      });
    } catch {
      return [];
    }
  }

  async getActivity(startDate: Date, endDate: Date): Promise<ActivitySample[]> {
    if (!this.initialized) return [];

    const [steps, energy] = await Promise.all([
      new Promise<any[]>((resolve) => {
        AppleHealthKit.getStepCount(
          { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
          (err, results) => {
            if (err || !results) {
              resolve([]);
            } else {
              const arr = Array.isArray(results) ? results : [results];
              resolve(arr);
            }
          }
        );
      }),
      new Promise<any[]>((resolve) => {
        AppleHealthKit.getActiveEnergyBurned(
          { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
          (err, results) => {
            if (err || !results) {
              resolve([]);
            } else {
              const arr = Array.isArray(results) ? results : [results];
              resolve(arr);
            }
          }
        );
      }),
    ]);

    // Combine and group by day
    const samples: ActivitySample[] = [];
    const dayMap = new Map<string, ActivitySample>();

    steps.forEach((s: any) => {
      const date = new Date(s.startDate).toISOString().split('T')[0];
      if (!dayMap.has(date)) {
        dayMap.set(date, { timestamp: new Date(s.startDate), source: 'apple_healthkit' });
      }
      const sample = dayMap.get(date)!;
      sample.steps = (sample.steps || 0) + s.value;
    });

    energy.forEach((e: any) => {
      const date = new Date(e.startDate).toISOString().split('T')[0];
      if (!dayMap.has(date)) {
        dayMap.set(date, { timestamp: new Date(e.startDate), source: 'apple_healthkit' });
      }
      const sample = dayMap.get(date)!;
      sample.activeEnergyBurned = (sample.activeEnergyBurned || 0) + e.value;
    });

    return Array.from(dayMap.values());
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

    // Poll every 60 seconds for new heart rate data
    this.monitoringInterval = setInterval(async () => {
      if (!this.initialized) return;

      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60000);

      // Get latest heart rate
      const hrSamples = await this.getHeartRate(oneMinuteAgo, now);
      if (hrSamples.length > 0 && this.heartRateSubscribers.size > 0) {
        const latest = hrSamples[hrSamples.length - 1];
        this.heartRateSubscribers.forEach((cb) => cb(latest));
      }

      // Get latest stress level (inferred from HRV)
      const stressLevels = await this.getStressLevel(oneMinuteAgo, now);
      if (stressLevels.length > 0 && this.stressSubscribers.size > 0) {
        const latest = stressLevels[stressLevels.length - 1];
        this.stressSubscribers.forEach((cb) => cb(latest));
      }
    }, 60000); // Check every minute
  }

  private stopMonitoringIfNeeded() {
    if (this.heartRateSubscribers.size === 0 && this.stressSubscribers.size === 0) {
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
        this.monitoringInterval = null;
      }
    }
  }

  private mapSleepType(value: string): string {
    const v = (value || '').toLowerCase();
    if (v.includes('awake') || v === 'inbed') return 'awake';
    if (v.includes('rem')) return 'rem';
    if (v.includes('deep') || v.includes('core')) return 'deep';
    if (v.includes('light')) return 'light';
    return 'unknown';
  }
}

