/**
 * Health Connect Provider (Android)
 * Enhanced with real-time monitoring support
 * Note: Health Connect aggregates data from Samsung Health, Google Fit, and other apps
 */
import { Platform } from 'react-native';
import type { HealthDataProvider, HeartRateSample, SleepSession, StressLevel, ActivitySample, HealthMetric } from '../types';

let hc: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  hc = require('react-native-health-connect');
} catch {
  hc = null;
}

export class HealthConnectProvider implements HealthDataProvider {
  platform = 'health_connect' as const;
  private heartRateSubscribers: Set<(sample: HeartRateSample) => void> = new Set();
  private stressSubscribers: Set<(level: StressLevel) => void> = new Set();
  private monitoringInterval: NodeJS.Timeout | null = null;

  async isAvailable(): Promise<boolean> {
    if (Platform.OS !== 'android' || !hc) return false;
    try {
      const { getSdkStatus, SdkAvailabilityStatus } = hc;
      const status = await getSdkStatus();
      return status === SdkAvailabilityStatus.SDK_AVAILABLE;
    } catch {
      return false;
    }
  }

  async requestPermissions(metrics: HealthMetric[]): Promise<boolean> {
    if (!(await this.isAvailable()) || !hc) return false;

    const permissions: any[] = [];

    if (metrics.includes('heart_rate') || metrics.includes('resting_heart_rate')) {
      permissions.push({ accessType: 'read', recordType: 'com.google.heart_rate' });
    }
    if (metrics.includes('sleep_analysis') || metrics.includes('sleep_stages')) {
      permissions.push(
        { accessType: 'read', recordType: 'com.google.sleep.session' },
        { accessType: 'read', recordType: 'com.google.sleep.stage' }
      );
    }
    if (metrics.includes('steps') || metrics.includes('active_energy')) {
      permissions.push({ accessType: 'read', recordType: 'com.google.steps' });
      permissions.push({ accessType: 'read', recordType: 'com.google.active_calories_burned' });
    }

    try {
      await hc.requestPermission(permissions);
      const granted = await hc.getGrantedPermissions();
      return granted && granted.length > 0;
    } catch {
      return false;
    }
  }

  async getHeartRate(startDate: Date, endDate: Date): Promise<HeartRateSample[]> {
    if (!(await this.isAvailable()) || !hc) return [];

    try {
      const records = await hc.readRecords('com.google.heart_rate', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        },
      });

      return (records || []).map((r: any) => {
        const packageName = r.dataOrigin?.packageName || 'health_connect';
        // Identify Samsung Health sources
        const isSamsungSource = 
          packageName.toLowerCase().includes('samsung') ||
          packageName.toLowerCase().includes('shealth') ||
          packageName.toLowerCase().includes('com.samsung.shealth');
        
        return {
          value: r.beatsPerMinute || r.value,
          timestamp: new Date(r.time),
          source: isSamsungSource ? 'samsung_health' : packageName,
        };
      });
    } catch {
      return [];
    }
  }

  async getRestingHeartRate(startDate: Date, endDate: Date): Promise<number | null> {
    // Health Connect doesn't have separate resting HR, filter low HR samples
    const hrSamples = await this.getHeartRate(startDate, endDate);
    if (hrSamples.length === 0) return null;

    const restingSamples = hrSamples.filter((s) => s.value < 70);
    if (restingSamples.length === 0) return null;

    const sum = restingSamples.reduce((acc, s) => acc + s.value, 0);
    return Math.round(sum / restingSamples.length);
  }

  async getSleepSessions(startDate: Date, endDate: Date): Promise<SleepSession[]> {
    if (!(await this.isAvailable()) || !hc) return [];

    try {
      const sessions = await hc.readRecords('com.google.sleep.session', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        },
      });

      const results: SleepSession[] = [];

      for (const session of sessions || []) {
        // Try to get sleep stages
        let stages: any[] = [];
        try {
          stages = await hc.readRecords('com.google.sleep.stage', {
            timeRangeFilter: {
              operator: 'between',
              startTime: session.startTime,
              endTime: session.endTime,
            },
          });
        } catch {
          // Stages not available
        }

          // Check if data source is Samsung Health
          const packageName = session.dataOrigin?.packageName || '';
          const isSamsungSource = 
            packageName.toLowerCase().includes('samsung') ||
            packageName.toLowerCase().includes('shealth') ||
            packageName.toLowerCase().includes('com.samsung.shealth');
          
          results.push({
          startTime: new Date(session.startTime),
          endTime: new Date(session.endTime),
          durationMinutes: Math.round(
            (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000
          ),
          efficiency: session.efficiency,
          stages: stages.map((s: any) => ({
            start: new Date(s.startTime),
            end: new Date(s.endTime),
            stage: this.mapSleepStage(s.stage),
          })),
          source: isSamsungSource ? 'samsung_health' : 'health_connect',
        });
      }

      return results;
    } catch {
      return [];
    }
  }

  async getStressLevel(startDate: Date, endDate: Date): Promise<StressLevel[]> {
    // Health Connect doesn't have direct stress level
    // Infer from heart rate variability if available, otherwise from HR patterns
    const hrSamples = await this.getHeartRate(startDate, endDate);
    if (hrSamples.length < 3) return [];

    const stresses: StressLevel[] = [];
    for (let i = 1; i < hrSamples.length; i++) {
      const prev = hrSamples[i - 1].value;
      const curr = hrSamples[i].value;
      const diff = Math.abs(curr - prev);
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
    if (!(await this.isAvailable()) || !hc) return [];

    try {
      const [steps, calories] = await Promise.all([
        hc.readRecords('com.google.steps', {
          timeRangeFilter: {
            operator: 'between',
            startTime: startDate.toISOString(),
            endTime: endDate.toISOString(),
          },
        }).catch(() => []),
        hc.readRecords('com.google.active_calories_burned', {
          timeRangeFilter: {
            operator: 'between',
            startTime: startDate.toISOString(),
            endTime: endDate.toISOString(),
          },
        }).catch(() => []),
      ]);

      const samples: ActivitySample[] = [];
      const dayMap = new Map<string, ActivitySample>();

      (steps || []).forEach((s: any) => {
        const date = new Date(s.time).toISOString().split('T')[0];
        const packageName = s.dataOrigin?.packageName || '';
        const isSamsungSource = 
          packageName.toLowerCase().includes('samsung') ||
          packageName.toLowerCase().includes('shealth') ||
          packageName.toLowerCase().includes('com.samsung.shealth');
        
        if (!dayMap.has(date)) {
          dayMap.set(date, { 
            timestamp: new Date(s.time), 
            source: isSamsungSource ? 'samsung_health' : 'health_connect' 
          });
        }
        const sample = dayMap.get(date)!;
        sample.steps = (sample.steps || 0) + (s.count || 0);
        // Update source if we find Samsung data
        if (isSamsungSource && sample.source !== 'samsung_health') {
          sample.source = 'samsung_health';
        }
      });

      (calories || []).forEach((c: any) => {
        const date = new Date(c.time).toISOString().split('T')[0];
        const packageName = c.dataOrigin?.packageName || '';
        const isSamsungSource = 
          packageName.toLowerCase().includes('samsung') ||
          packageName.toLowerCase().includes('shealth') ||
          packageName.toLowerCase().includes('com.samsung.shealth');
        
        if (!dayMap.has(date)) {
          dayMap.set(date, { 
            timestamp: new Date(c.time), 
            source: isSamsungSource ? 'samsung_health' : 'health_connect' 
          });
        }
        dayMap.get(date)!.activeEnergyBurned = (dayMap.get(date)!.activeEnergyBurned || 0) + (c.energy || 0);
        // Update source if we find Samsung data
        if (isSamsungSource && dayMap.get(date)!.source !== 'samsung_health') {
          dayMap.get(date)!.source = 'samsung_health';
        }
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

  private mapSleepStage(stage: string): 'awake' | 'light' | 'deep' | 'rem' | 'unknown' {
    const s = (stage || '').toLowerCase();
    if (s.includes('awake')) return 'awake';
    if (s.includes('rem')) return 'rem';
    if (s.includes('deep')) return 'deep';
    if (s.includes('light')) return 'light';
    return 'unknown';
  }
}

