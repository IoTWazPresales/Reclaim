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
