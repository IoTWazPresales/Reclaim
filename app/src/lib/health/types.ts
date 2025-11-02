/**
 * Unified Health Data Types
 * Abstraction layer for health platforms (Apple HealthKit on iOS, Google Fit on Android)
 */

export type HealthPlatform = 'apple_healthkit' | 'google_fit' | 'unknown';

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
  hasPermissions?(metrics: HealthMetric[]): Promise<boolean>; // Optional: check if permissions are granted
  getHeartRate(startDate: Date, endDate: Date): Promise<HeartRateSample[]>;
  getRestingHeartRate(startDate: Date, endDate: Date): Promise<number | null>;
  getSleepSessions(startDate: Date, endDate: Date): Promise<SleepSession[]>;
  getStressLevel(startDate: Date, endDate: Date): Promise<StressLevel[]>;
  getActivity(startDate: Date, endDate: Date): Promise<ActivitySample[]>;
  subscribeToHeartRate(callback: (sample: HeartRateSample) => void): () => void; // returns unsubscribe
  subscribeToStressLevel(callback: (level: StressLevel) => void): () => void; // returns unsubscribe
}

/**
 * Unified health data access - automatically uses best available platform
 */
export interface UnifiedHealthService {
  getAvailablePlatforms(): Promise<HealthPlatform[]>;
  getActivePlatform(): HealthPlatform | null;
  requestAllPermissions(): Promise<boolean>;
  hasAllPermissions(): Promise<boolean>;
  
  // Real-time monitoring
  startMonitoring(): Promise<void>;
  stopMonitoring(): Promise<void>;
  isMonitoring(): boolean;
  
  // Data access (unified)
  getLatestHeartRate(): Promise<HeartRateSample | null>;
  getLatestRestingHeartRate(): Promise<number | null>;
  getLatestSleepSession(): Promise<SleepSession | null>;
  getLatestStressLevel(): Promise<StressLevel | null>;
  getTodayActivity(): Promise<ActivitySample | null>;
  
  // Subscriptions for reactive notifications
  onHeartRateSpike(callback: (sample: HeartRateSample) => void): () => void;
  onHighStress(callback: (level: StressLevel) => void): () => void;
  onLowActivity(callback: (sample: ActivitySample) => void): () => void;
  onSleepEnd(callback: (session: SleepSession) => void): () => void;
}

