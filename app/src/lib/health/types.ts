/**
 * Unified Health Data Types
 * Abstraction layer for health platforms (Apple HealthKit on iOS, Google Fit on Android)
 */

export type HealthPlatform =
  | 'apple_healthkit'
  | 'google_fit'
  | 'garmin'
  | 'huawei'
  | 'unknown';

export type HealthMetric =
  | 'heart_rate'
  | 'heart_rate_variability'
  | 'sleep_analysis'
  | 'sleep_stages'
  | 'stress_level'
  | 'steps'
  | 'active_energy'
  | 'resting_heart_rate'
  | 'activity_level';

export interface HeartRateSample {
  value: number; // bpm
  timestamp: Date;
  source?: string;
}

export interface SleepSession {
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  efficiency?: number; // 0-1
  stages?: SleepStageSegment[];
  source: HealthPlatform;
  metadata?: {
    avgHeartRate?: number;
    minHeartRate?: number;
    maxHeartRate?: number;
    bodyTemperature?: number; // Celsius
    deepSleepMinutes?: number;
    remSleepMinutes?: number;
    lightSleepMinutes?: number;
    awakeMinutes?: number;
  };
}

export interface SleepStageSegment {
  start: Date;
  end: Date;
  stage: 'awake' | 'light' | 'deep' | 'rem' | 'unknown';
}

export interface StressLevel {
  value: number; // 0-100 or platform-specific
  timestamp: Date;
  source?: string;
}

export interface ActivitySample {
  steps?: number;
  activeEnergyBurned?: number; // calories
  timestamp: Date;
  source?: string;
}

export interface HealthDataProvider {
  platform: HealthPlatform;
  isAvailable(): Promise<boolean>;
  requestPermissions(metrics: HealthMetric[]): Promise<boolean>;
  hasPermissions?(metrics: HealthMetric[]): Promise<boolean>;
  getHeartRate(startDate: Date, endDate: Date): Promise<HeartRateSample[]>;
  getRestingHeartRate(startDate: Date, endDate: Date): Promise<number | null>;
  getSleepSessions(startDate: Date, endDate: Date): Promise<SleepSession[]>;
  getStressLevel(startDate: Date, endDate: Date): Promise<StressLevel[]>;
  getActivity(startDate: Date, endDate: Date): Promise<ActivitySample[]>;
  subscribeToHeartRate(callback: (sample: HeartRateSample) => void): () => void;
  subscribeToStressLevel(callback: (level: StressLevel) => void): () => void;
}

export type HeartRateListener = (sample: HeartRateSample) => void;
export type StressListener = (level: StressLevel) => void;
export type ActivityListener = (sample: ActivitySample) => void;

