/**
 * Unified Health Data Types
 * Abstraction layer for health platforms (Apple HealthKit on iOS, Google Fit on Android)
 */

export type HealthPlatform =
  | 'apple_healthkit'
  | 'google_fit'
  | 'health_connect'
  | 'samsung_health'
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
  | 'activity_level'
  // ---- Health Connect extended metrics (Android) ----
  | 'active_calories_burned'
  | 'total_calories_burned'
  | 'activity_intensity'
  | 'basal_body_temperature'
  | 'basal_metabolic_rate'
  | 'blood_glucose'
  | 'blood_pressure'
  | 'body_fat'
  | 'body_temperature'
  | 'body_water_mass'
  | 'bone_mass'
  | 'cervical_mucus'
  | 'cycling_pedaling_cadence'
  | 'distance'
  | 'elevation_gained'
  | 'exercise_session'
  | 'exercise_route'
  | 'floors_climbed'
  | 'height'
  | 'hydration'
  | 'intermenstrual_bleeding'
  | 'lean_body_mass'
  | 'menstruation'
  | 'mindfulness'
  | 'nutrition'
  | 'ovulation_test'
  | 'oxygen_saturation'
  | 'planned_exercise'
  | 'power'
  | 'respiratory_rate'
  | 'sexual_activity'
  | 'skin_temperature'
  | 'speed'
  | 'steps_cadence'
  | 'vo2_max'
  | 'weight'
  | 'wheelchair_pushes';

export interface HeartRateSample {
  value: number; // bpm
  timestamp: Date;
  source?: string;
}

export interface SleepSession {
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  efficiency?: number; // 0–1 (fractional efficiency, 0–100% shown in UI)
  stages?: SleepStageSegment[];
  source: HealthPlatform;
  metadata?: {
    // Vitals aggregated over the sleep window
    avgHeartRate?: number;
    minHeartRate?: number;
    maxHeartRate?: number;
    bodyTemperature?: number; // Celsius
    skinTemperature?: number; // Celsius (if separate from core/body)

    // Stage-duration summaries (minutes)
    deepSleepMinutes?: number;
    remSleepMinutes?: number;
    lightSleepMinutes?: number;
    awakeMinutes?: number;

    // Heart-rate variability (RMSSD, ms)
    hrvRmssdMs?: number;

    // Respiratory / oxygen summaries
    avgRespiratoryRate?: number;
    avgSpO2?: number;
    minSpO2?: number;

    // Classification and provenance
    sessionType?: 'main' | 'nap' | 'other';
    device?: string;
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

