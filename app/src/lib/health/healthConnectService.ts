import { Platform } from 'react-native';
import {
  getSdkStatus,
  initialize,
  requestPermission,
  getGrantedPermissions,
  readRecords,
  revokeAllPermissions,
  SdkAvailabilityStatus,
  SleepStageType,
} from 'react-native-health-connect';
import type {
  Permission,
  RecordType,
  RecordResult,
} from 'react-native-health-connect';

import { logger } from '@/lib/logger';
import type { HealthMetric, SleepSession, SleepStageSegment } from '@/lib/health/types';

export const HEALTH_CONNECT_MIN_ANDROID_VERSION = 33;
export const HEALTH_CONNECT_SLEEP_METRICS: HealthMetric[] = [
  'sleep_analysis',
  'sleep_stages',
];

type HealthConnectAvailability =
  | 'available'
  | 'needs_update'
  | 'needs_install'
  | 'unsupported';

type SleepStageEntry = NonNullable<RecordResult<'SleepSession'>['stages']>[number];

const DEFAULT_PERMISSION_METRICS: HealthMetric[] = [
  'sleep_analysis',
  'sleep_stages',
  'heart_rate',
  'resting_heart_rate',
  'heart_rate_variability',
  'steps',
  'active_energy',
  'activity_level',
];

const METRIC_RECORD_MAP: Partial<Record<HealthMetric, RecordType[]>> = {
  sleep_analysis: ['SleepSession'],
  sleep_stages: ['SleepSession'],
  heart_rate: ['HeartRate'],
  resting_heart_rate: ['RestingHeartRate'],
  heart_rate_variability: ['HeartRateVariabilityRmssd'],
  steps: ['Steps'],
  active_energy: ['ActiveCaloriesBurned', 'TotalCaloriesBurned'],
  activity_level: ['ExerciseSession'],
};

let initialized = false;
let initializing: Promise<boolean> | null = null;

function isAndroid13OrNewer(): boolean {
  if (Platform.OS !== 'android') return false;
  const version =
    typeof Platform.Version === 'number'
      ? Platform.Version
      : parseInt(String(Platform.Version), 10);
  return Number.isFinite(version) && version >= HEALTH_CONNECT_MIN_ANDROID_VERSION;
}

async function ensureInitialized(): Promise<boolean> {
  if (initialized) return true;
  if (initializing) return initializing;

  initializing = (async () => {
    try {
      const ok = await initialize();
      initialized = ok;
      return ok;
    } catch (error) {
      logger.warn('[HealthConnect] initialize failed', error);
      throw error;
    } finally {
      initializing = null;
    }
  })();

  return initializing;
}

function buildPermissions(metrics: HealthMetric[]): Permission[] {
  const records = new Set<RecordType>();
  metrics.forEach((metric) => {
    METRIC_RECORD_MAP[metric]?.forEach((record) => records.add(record));
  });
  return Array.from(records).map((record) => ({
    accessType: 'read',
    recordType: record,
  }));
}

async function fetchSdkStatus(): Promise<number | null> {
  if (!isAndroid13OrNewer()) return null;
  try {
    return await getSdkStatus();
  } catch (error) {
    logger.warn('[HealthConnect] getSdkStatus failed', error);
    return null;
  }
}

export async function getHealthConnectAvailability(): Promise<HealthConnectAvailability> {
  if (!isAndroid13OrNewer()) {
    return 'unsupported';
  }
  const status = await fetchSdkStatus();
  if (status === SdkAvailabilityStatus.SDK_AVAILABLE) {
    return 'available';
  }
  if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
    return 'needs_update';
  }
  return 'needs_install';
}

export async function healthConnectIsAvailable(): Promise<boolean> {
  return (await getHealthConnectAvailability()) === 'available';
}

export async function healthConnectRequestPermissions(
  metrics: HealthMetric[] = DEFAULT_PERMISSION_METRICS
): Promise<boolean> {
  const availability = await getHealthConnectAvailability();
  if (availability === 'unsupported') {
    throw new Error('Health Connect is only available on Android 13 or later.');
  }
  if (availability === 'needs_install') {
    throw new Error('Install the Health Connect app from Google Play, then try again.');
  }
  if (availability === 'needs_update') {
    throw new Error('Update the Health Connect app from Google Play, then try again.');
  }

  const ready = await ensureInitialized();
  if (!ready) {
    throw new Error('Health Connect initialization failed.');
  }

  const permissions = buildPermissions(metrics);
  if (!permissions.length) {
    return false;
  }

  const granted = await requestPermission(permissions);
  return permissions.every((perm) =>
    granted.some(
      (item) => item.recordType === perm.recordType && item.accessType === perm.accessType
    )
  );
}

export async function healthConnectHasPermissions(
  metrics: HealthMetric[] = DEFAULT_PERMISSION_METRICS
): Promise<boolean> {
  if (!(await healthConnectIsAvailable())) {
    return false;
  }
  try {
    await ensureInitialized();
  } catch {
    return false;
  }

  const required = buildPermissions(metrics);
  if (!required.length) return false;

  try {
    const granted = await getGrantedPermissions();
    return required.every((perm) =>
      granted.some(
        (item) => item.recordType === perm.recordType && item.accessType === perm.accessType
      )
    );
  } catch (error) {
    logger.warn('[HealthConnect] getGrantedPermissions failed', error);
    return false;
  }
}

export async function healthConnectGetLatestSleepSession(): Promise<SleepSession | null> {
  const sessions = await healthConnectGetSleepSessions(7);
  return sessions[0] ?? null;
}

export async function healthConnectGetSleepSessions(days = 30): Promise<SleepSession[]> {
  const hasPerms = await healthConnectHasPermissions(HEALTH_CONNECT_SLEEP_METRICS);
  if (!hasPerms) return [];

  const ready = await ensureInitialized();
  if (!ready) return [];

  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));

  try {
    const response = await readRecords('SleepSession', {
      timeRangeFilter: {
        operator: 'between',
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      },
      ascendingOrder: false,
    });

    return response.records
      .map(mapRecordToSleepSession)
      .filter((session): session is SleepSession => session !== null)
      .sort((a, b) => b.endTime.getTime() - a.endTime.getTime());
  } catch (error) {
    logger.warn('[HealthConnect] readRecords failed', error);
    return [];
  }
}

export async function healthConnectRevokeAllPermissions(): Promise<void> {
  if (!isAndroid13OrNewer()) return;
  try {
    await revokeAllPermissions();
  } catch (error) {
    logger.warn('[HealthConnect] revokeAllPermissions failed', error);
  }
}

function mapRecordToSleepSession(record: RecordResult<'SleepSession'>): SleepSession | null {
  const startTime = safeDate(record.startTime);
  const endTime = safeDate(record.endTime);
  if (!startTime || !endTime || !(endTime > startTime)) {
    return null;
  }

  const stages =
    record.stages
      ?.map((stage) => mapStageSegment(stage))
      .filter((segment): segment is NonNullable<typeof segment> => Boolean(segment)) ?? [];

  return {
    startTime,
    endTime,
    durationMinutes: Math.max(
      0,
      Math.round((endTime.getTime() - startTime.getTime()) / 60000)
    ),
    efficiency: undefined,
    stages,
    source: 'health_connect',
    metadata: undefined,
  };
}

function mapStageSegment(stage: SleepStageEntry): SleepStageSegment | null {
  const start = safeDate(stage.startTime);
  const end = safeDate(stage.endTime);
  if (!start || !end) return null;

  return {
    start,
    end,
    stage: mapStageType(stage.stage),
  };
}

function mapStageType(stageType?: number): SleepStageSegment['stage'] {
  switch (stageType) {
    case SleepStageType.AWAKE:
    case SleepStageType.OUT_OF_BED:
      return 'awake';
    case SleepStageType.DEEP:
      return 'deep';
    case SleepStageType.REM:
      return 'rem';
    case SleepStageType.SLEEPING:
    case SleepStageType.LIGHT:
      return 'light';
    default:
      return 'unknown';
  }
}

function safeDate(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

