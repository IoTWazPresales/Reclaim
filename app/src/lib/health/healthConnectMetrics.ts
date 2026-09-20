import type { HealthMetric } from '@/lib/health/types';

export const HEALTH_CONNECT_MIN_ANDROID_VERSION = 33;

export const HEALTH_CONNECT_SLEEP_METRICS: HealthMetric[] = [
  'sleep_analysis',
  'sleep_stages',
];

/** Metrics requested at Health Connect connect time. Must match Play keep-and-justify + the Android plugin. */
export const HEALTH_CONNECT_DEFAULT_METRICS: HealthMetric[] = [
  ...HEALTH_CONNECT_SLEEP_METRICS,
  'heart_rate',
  'oxygen_saturation',
  'respiratory_rate',
  'body_temperature',
  'steps',
  'active_energy',
];

/** Types we must never request this cycle (Play ghost / high-sensitivity). */
export const HEALTH_CONNECT_FORBIDDEN_REQUEST_METRICS: HealthMetric[] = [
  'resting_heart_rate',
  'heart_rate_variability',
];

/**
 * Health Connect record types for each metric. Used by request-time mapping
 * and by the declared=requested=used vitest (N-0036).
 */
export const HEALTH_CONNECT_RECORD_BY_METRIC: Partial<Record<HealthMetric, readonly string[]>> = {
  sleep_analysis: ['SleepSession'],
  sleep_stages: ['SleepSession'],
  heart_rate: ['HeartRate'],
  resting_heart_rate: ['RestingHeartRate'],
  heart_rate_variability: ['HeartRateVariabilityRmssd'],
  active_energy: ['ActiveCaloriesBurned'],
  oxygen_saturation: ['OxygenSaturation'],
  respiratory_rate: ['RespiratoryRate'],
  body_temperature: ['BodyTemperature'],
  steps: ['Steps'],
};

/** Plugin READ_* permission → Health Connect record type. */
export const HEALTH_CONNECT_ANDROID_READ_PERMISSION_TO_RECORD: Record<string, string> = {
  'android.permission.health.READ_SLEEP': 'SleepSession',
  'android.permission.health.READ_HEART_RATE': 'HeartRate',
  'android.permission.health.READ_OXYGEN_SATURATION': 'OxygenSaturation',
  'android.permission.health.READ_RESPIRATORY_RATE': 'RespiratoryRate',
  'android.permission.health.READ_BODY_TEMPERATURE': 'BodyTemperature',
  'android.permission.health.READ_STEPS': 'Steps',
  'android.permission.health.READ_ACTIVE_CALORIES_BURNED': 'ActiveCaloriesBurned',
};

/** Plugin WRITE_* permission → Health Connect record type. */
export const HEALTH_CONNECT_ANDROID_WRITE_PERMISSION_TO_RECORD: Record<string, string> = {
  'android.permission.health.WRITE_EXERCISE': 'ExerciseSession',
};

/**
 * Location / route permission family. Currently unused (Strength-only).
 * R3 must add the same strings to declared, requested, and used together.
 */
export const LOCATION_ANDROID_PERMISSIONS = [
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.FOREGROUND_SERVICE_LOCATION',
  'android.permission.health.READ_EXERCISE_ROUTES',
  'android.permission.health.WRITE_EXERCISE_ROUTE',
] as const;

export function recordsForRequestedMetrics(metrics: readonly HealthMetric[]): string[] {
  const records = new Set<string>();
  for (const metric of metrics) {
    for (const record of HEALTH_CONNECT_RECORD_BY_METRIC[metric] ?? []) {
      records.add(record);
    }
  }
  return [...records].sort();
}
