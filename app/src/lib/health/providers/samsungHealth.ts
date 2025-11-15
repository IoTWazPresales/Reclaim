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

const SamsungHealthNative = NativeModules.SamsungHealth as
  | {
      isAvailable: () => Promise<boolean>;
      connect: () => Promise<boolean>;
      disconnect: () => void;
      readDailySteps: (start: number, end: number) => Promise<NativeStepResponse>;
      readSleepSessions: (start: number, end: number) => Promise<NativeSleepSession[]>;
      readHeartRate: (start: number, end: number) => Promise<NativeHeartRate[]>;
    }
  | undefined;

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
    if (!this.isSupported()) return [];
    try {
      const sessions = await SamsungHealthNative!.readSleepSessions(
        startDate.getTime(),
        endDate.getTime()
      );
      if (!Array.isArray(sessions)) return [];
      return sessions.map<SleepSession>((session) => ({
        startTime: new Date(session.start),
        endTime: new Date(session.end),
        durationMinutes: Math.round((session.end - session.start) / 60000),
        efficiency: undefined,
        stages: [],
        source: 'samsung_health',
      }));
    } catch {
      return [];
    }
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

