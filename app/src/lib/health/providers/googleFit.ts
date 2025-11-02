/**
 * Google Fit Provider
 * Enhanced implementation with real-time monitoring support
 */
import { Platform } from 'react-native';
import GoogleFit, { Scopes } from 'react-native-google-fit';
import type { HealthDataProvider, HeartRateSample, SleepSession, StressLevel, ActivitySample, HealthMetric } from '../types';

export class GoogleFitProvider implements HealthDataProvider {
  platform = 'google_fit' as const;
  private authorized = false;
  private heartRateSubscribers: Set<(sample: HeartRateSample) => void> = new Set();
  private stressSubscribers: Set<(level: StressLevel) => void> = new Set();
  private monitoringInterval: NodeJS.Timeout | null = null;

  async isAvailable(): Promise<boolean> {
    // Google Fit is available on Android
    // Note: Google Fit automatically aggregates data from Samsung Health if the user
    // has Google Fit installed and Samsung Health is syncing to it
    return Platform.OS === 'android';
  }

  async hasPermissions(metrics: HealthMetric[]): Promise<boolean> {
    if (!(await this.isAvailable())) return false;
    
    // Check if Google Fit is authorized
    return this.authorized;
  }

  async requestPermissions(metrics: HealthMetric[]): Promise<boolean> {
    if (!(await this.isAvailable())) return false;

    const scopes = [Scopes.FITNESS_SLEEP_READ];
    
    if (metrics.includes('heart_rate') || metrics.includes('resting_heart_rate')) {
      scopes.push(Scopes.FITNESS_HEART_RATE_READ);
    }
    if (metrics.includes('steps') || metrics.includes('active_energy')) {
      scopes.push(Scopes.FITNESS_ACTIVITY_READ);
    }

    try {
      const auth = await GoogleFit.authorize({ scopes });
      this.authorized = auth.success;
      return auth.success;
    } catch {
      return false;
    }
  }

  async getHeartRate(startDate: Date, endDate: Date): Promise<HeartRateSample[]> {
    if (!this.authorized) return [];

    try {
      const samples = await GoogleFit.getHeartRateSamples({
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
          source: isSamsungSource ? 'samsung_health' : (s.sourceName || 'google_fit'),
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
      const samples = await GoogleFit.getSleepSamples(
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
        GoogleFit.getDailyStepCountSamples({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
        GoogleFit.getDailyCalorieSamples({
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
          source: isSamsungSource ? 'samsung_health' : 'google_fit',
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

