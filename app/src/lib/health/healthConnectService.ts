import { AppState, Platform } from 'react-native';
import {
  getSdkStatus,
  initialize,
  requestPermission,
  getGrantedPermissions,
  readRecords,
  revokeAllPermissions,
  SdkAvailabilityStatus,
  SleepStageType,
  type Permission,
  type RecordType,
  type RecordResult,
} from 'react-native-health-connect';

import { logger } from '@/lib/logger';
import type { ActivitySample, HealthMetric, SleepSession, SleepStageSegment } from '@/lib/health/types';

export const HEALTH_CONNECT_MIN_ANDROID_VERSION = 33;
export const HEALTH_CONNECT_SLEEP_METRICS: HealthMetric[] = [
  'sleep_analysis',
  'sleep_stages',
];

export const HEALTH_CONNECT_DEFAULT_METRICS: HealthMetric[] = [
  ...HEALTH_CONNECT_SLEEP_METRICS,
  // Core activity + vitals
  'steps',
  'steps_cadence',
  'active_energy',
  'active_calories_burned',
  'total_calories_burned',
  'distance',
  'elevation_gained',
  'floors_climbed',
  'speed',
  'vo2_max',
  'wheelchair_pushes',
  'heart_rate',
  'resting_heart_rate',
  'heart_rate_variability',
  'respiratory_rate',
  'oxygen_saturation',
  'body_temperature',
  // Body measurements
  'weight',
  'height',
  'body_fat',
  'lean_body_mass',
  'body_water_mass',
  'bone_mass',
  'basal_metabolic_rate',
  // Exercise / planned exercise
  'exercise_session',
  'cycling_pedaling_cadence',
  'power',
  // Nutrition / hydration
  'nutrition',
  'hydration',
  // Cycle tracking
  'basal_body_temperature',
  'cervical_mucus',
  'intermenstrual_bleeding',
  'menstruation',
  'ovulation_test',
  'sexual_activity',
  // Wellness
  'mindfulness',
];

type HealthConnectAvailability =
  | 'available'
  | 'needs_update'
  | 'needs_install'
  | 'unsupported';

type SleepStageEntry = NonNullable<RecordResult<'SleepSession'>['stages']>[number];

const DEFAULT_PERMISSION_METRICS: HealthMetric[] = HEALTH_CONNECT_SLEEP_METRICS;

const METRIC_RECORD_MAP: Partial<Record<HealthMetric, RecordType[]>> = {
  sleep_analysis: ['SleepSession'],
  sleep_stages: ['SleepSession'],
  heart_rate: ['HeartRate'],
  resting_heart_rate: ['RestingHeartRate'],
  heart_rate_variability: ['HeartRateVariabilityRmssd'],
  steps: ['Steps'],
  active_energy: ['ActiveCaloriesBurned', 'TotalCaloriesBurned'],
  activity_level: ['ExerciseSession'],
  // ---- Health Connect extended record types ----
  active_calories_burned: ['ActiveCaloriesBurned'],
  total_calories_burned: ['TotalCaloriesBurned'],
  basal_body_temperature: ['BasalBodyTemperature'],
  basal_metabolic_rate: ['BasalMetabolicRate'],
  blood_glucose: ['BloodGlucose'],
  blood_pressure: ['BloodPressure'],
  body_fat: ['BodyFat'],
  body_temperature: ['BodyTemperature'],
  body_water_mass: ['BodyWaterMass'],
  bone_mass: ['BoneMass'],
  cervical_mucus: ['CervicalMucus'],
  cycling_pedaling_cadence: ['CyclingPedalingCadence'],
  distance: ['Distance'],
  elevation_gained: ['ElevationGained'],
  exercise_session: ['ExerciseSession'],
  floors_climbed: ['FloorsClimbed'],
  height: ['Height'],
  hydration: ['Hydration'],
  intermenstrual_bleeding: ['IntermenstrualBleeding'],
  lean_body_mass: ['LeanBodyMass'],
  menstruation: ['MenstruationFlow', 'MenstruationPeriod'],
  nutrition: ['Nutrition'],
  ovulation_test: ['OvulationTest'],
  oxygen_saturation: ['OxygenSaturation'],
  power: ['Power'],
  respiratory_rate: ['RespiratoryRate'],
  sexual_activity: ['SexualActivity'],
  speed: ['Speed'],
  steps_cadence: ['StepsCadence'],
  vo2_max: ['Vo2Max'],
  weight: ['Weight'],
  wheelchair_pushes: ['WheelchairPushes'],
  mindfulness: ['MindfulnessSession'],
};

const HEALTH_CONNECT_NO_DIALOG_ERROR = 'HEALTH_CONNECT_NO_DIALOG_OR_UNAVAILABLE';

let initialized = false;
let initializing: Promise<boolean> | null = null;
let requestingPermissions = false;

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
      const msg = (error as any)?.message ?? String(error);
      // Single-line log (avoid dumping native stack traces into logs).
      logger.warn(`[HealthConnect] initialize failed: ${msg}`);
      return false;
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
  // Safety: only launch the native permission UI from foreground.
  if (AppState.currentState !== 'active') {
    logger.warn('[HealthConnect] requestPermissions ignored (app not active)');
    return false;
  }

  // Safety: prevent double-invocation / concurrent permission dialogs.
  if (requestingPermissions) {
    logger.warn('[HealthConnect] requestPermissions ignored (already in progress)');
    return false;
  }
  requestingPermissions = true;

  try {
    const availability = await getHealthConnectAvailability();
    if (availability !== 'available') {
      logger.warn(`[HealthConnect] requestPermissions unavailable: ${availability}`);
      return false;
  }

  const ready = await ensureInitialized();
  if (!ready) {
      logger.warn('[HealthConnect] requestPermissions blocked (initialize failed)');
      return false;
  }

  const permissions = buildPermissions(metrics);
  if (!permissions.length) {
    return false;
  }

    let grantedPermissions: Permission[] = [];
    try {
      grantedPermissions = (await requestPermission(permissions)) as Permission[];
    } catch (error: any) {
      // Safety: never crash the JS call-site if native permission UI throws.
      const msg = error?.message ?? String(error);
      logger.warn(`[HealthConnect] requestPermission failed: ${msg}`);
      return false;
    }

    let effectiveGranted = grantedPermissions;
    if (grantedPermissions.length === 0) {
      let currentlyGranted: Permission[] = [];
      try {
        currentlyGranted = (await getGrantedPermissions()) as Permission[];
      } catch (error: any) {
        const msg = error?.message ?? String(error);
        logger.warn(`[HealthConnect] getGrantedPermissions failed: ${msg}`);
      }

      if (currentlyGranted.length === 0) {
        // Clean failure result (no-throw); caller can decide how to message this.
        logger.warn(`[HealthConnect] ${HEALTH_CONNECT_NO_DIALOG_ERROR}`);
        return false;
      }
      effectiveGranted = currentlyGranted;
    }

  return permissions.every((perm) =>
      effectiveGranted.some(
      (item) => item.recordType === perm.recordType && item.accessType === perm.accessType
    )
  );
  } catch (error: any) {
    const msg = error?.message ?? String(error);
    // Single-line failure log and clean failure result.
    logger.warn(`[HealthConnect] healthConnectRequestPermissions failed: ${msg}`);
    return false;
  } finally {
    requestingPermissions = false;
  }
}

export async function healthConnectHasPermissions(
  metrics: HealthMetric[] = DEFAULT_PERMISSION_METRICS
): Promise<boolean> {
  if (!(await healthConnectIsAvailable())) {
    return false;
  }
  const ready = await ensureInitialized();
  if (!ready) {
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
  start.setHours(0, 0, 0, 0);
  // end is "now" so we include sessions that ended this morning

  try {
    const response = await readRecords('SleepSession', {
      timeRangeFilter: {
        operator: 'between',
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      },
      ascendingOrder: false,
    });

    const sessions = response.records
      .map(mapRecordToSleepSession)
      .filter((session): session is SleepSession => session !== null)
      .sort((a, b) => b.endTime.getTime() - a.endTime.getTime());

    // Best-effort enrichment (vitals during sleep window). If permissions are missing or reads fail,
    // we still return base sessions with stages/efficiency.
    await enrichSleepSessionsWithVitals(sessions);
    return sessions;
  } catch (error) {
    logger.warn('[HealthConnect] readRecords failed', error);
    return [];
  }
}

type DailyVitals = {
  date: Date;
  restingHeartRateBpm?: number | null;
  hrvRmssdMs?: number | null;
  avgHeartRateBpm?: number | null;
  minHeartRateBpm?: number | null;
  maxHeartRateBpm?: number | null;
};

function dayKeyFromDate(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

function dateFromDayKey(dayKey: string): Date {
  // Build a Date in local time for the dayKey; callers typically normalize again before saving.
  const [y, m, d] = dayKey.split('-').map((v) => parseInt(v, 10));
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export async function healthConnectGetDailyActivity(days = 7): Promise<ActivitySample[]> {
  const hasPerms = await healthConnectHasPermissions(['steps', 'active_energy']);
  if (!hasPerms) return [];

  const ready = await ensureInitialized();
  if (!ready) return [];

  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  try {
    const [stepsRes, activeEnergyRes] = await Promise.all([
      readRecords('Steps', {
        timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: end.toISOString() },
        ascendingOrder: false,
      }),
      readRecords('ActiveCaloriesBurned', {
        timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: end.toISOString() },
        ascendingOrder: false,
      }).catch(async () =>
        readRecords('TotalCaloriesBurned', {
          timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: end.toISOString() },
          ascendingOrder: false,
        }),
      ),
    ]);

    const stepsByDay = new Map<string, number>();
    for (const rec of (stepsRes as any)?.records ?? []) {
      const t = safeDate((rec as any).startTime) ?? safeDate((rec as any).time) ?? safeDate((rec as any).endTime);
      if (!t) continue;
      const key = dayKeyFromDate(t);
      const count =
        typeof (rec as any).count === 'number'
          ? (rec as any).count
          : typeof (rec as any).steps === 'number'
            ? (rec as any).steps
            : typeof (rec as any).value === 'number'
              ? (rec as any).value
              : 0;
      stepsByDay.set(key, (stepsByDay.get(key) ?? 0) + (Number.isFinite(count) ? count : 0));
    }

    const energyByDay = new Map<string, number>();
    for (const rec of (activeEnergyRes as any)?.records ?? []) {
      const t = safeDate((rec as any).startTime) ?? safeDate((rec as any).time) ?? safeDate((rec as any).endTime);
      if (!t) continue;
      const key = dayKeyFromDate(t);
      const energyObj = (rec as any).energy;
      const cals =
        typeof (rec as any).calories === 'number'
          ? (rec as any).calories
          : typeof (energyObj?.inCalories) === 'number'
            ? energyObj.inCalories
            : typeof (energyObj?.calories) === 'number'
              ? energyObj.calories
              : typeof (rec as any).value === 'number'
                ? (rec as any).value
                : 0;
      energyByDay.set(key, (energyByDay.get(key) ?? 0) + (Number.isFinite(cals) ? cals : 0));
    }

    const allKeys = new Set<string>([...stepsByDay.keys(), ...energyByDay.keys()]);
    return Array.from(allKeys)
      .map((key) => ({
        timestamp: dateFromDayKey(key),
        steps: stepsByDay.get(key),
        activeEnergyBurned: energyByDay.get(key),
        source: 'health_connect',
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  } catch (error) {
    logger.warn('[HealthConnect] readRecords activity failed', error);
    return [];
  }
}

export async function healthConnectGetTodayActivity(): Promise<ActivitySample | null> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = await healthConnectGetDailyActivity(1);
  const today = days.find((s) => {
    const d = new Date(s.timestamp);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === start.getTime();
  });
  return today ?? null;
}

export async function healthConnectGetDailyVitals(days = 7): Promise<DailyVitals[]> {
  const hasPerms = await healthConnectHasPermissions([
    'heart_rate',
    'resting_heart_rate',
    'heart_rate_variability',
  ]);
  if (!hasPerms) return [];

  const ready = await ensureInitialized();
  if (!ready) return [];

  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  try {
    const [hrRes, restingRes, hrvRes] = await Promise.all([
      readRecords('HeartRate', {
        timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: end.toISOString() },
        ascendingOrder: false,
      }).catch(() => ({ records: [] } as any)),
      readRecords('RestingHeartRate', {
        timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: end.toISOString() },
        ascendingOrder: false,
      }).catch(() => ({ records: [] } as any)),
      readRecords('HeartRateVariabilityRmssd', {
        timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: end.toISOString() },
        ascendingOrder: false,
      }).catch(() => ({ records: [] } as any)),
    ]);

    const hrStatsByDay = new Map<string, { sum: number; count: number; min: number; max: number }>();
    for (const rec of (hrRes as any)?.records ?? []) {
      const samples = Array.isArray((rec as any).samples) ? (rec as any).samples : null;
      if (samples?.length) {
        for (const s of samples) {
          const t = safeDate((s as any).time) ?? safeDate((s as any).startTime) ?? safeDate((rec as any).startTime);
          if (!t) continue;
          const key = dayKeyFromDate(t);
          const bpm =
            typeof (s as any).beatsPerMinute === 'number'
              ? (s as any).beatsPerMinute
              : typeof (s as any).bpm === 'number'
                ? (s as any).bpm
                : typeof (s as any).value === 'number'
                  ? (s as any).value
                  : null;
          if (bpm === null || !Number.isFinite(bpm)) continue;
          const prev = hrStatsByDay.get(key) ?? { sum: 0, count: 0, min: bpm, max: bpm };
          prev.sum += bpm;
          prev.count += 1;
          prev.min = Math.min(prev.min, bpm);
          prev.max = Math.max(prev.max, bpm);
          hrStatsByDay.set(key, prev);
        }
      } else {
        const t = safeDate((rec as any).time) ?? safeDate((rec as any).startTime) ?? safeDate((rec as any).endTime);
        if (!t) continue;
        const key = dayKeyFromDate(t);
        const bpm =
          typeof (rec as any).beatsPerMinute === 'number'
            ? (rec as any).beatsPerMinute
            : typeof (rec as any).bpm === 'number'
              ? (rec as any).bpm
              : typeof (rec as any).value === 'number'
                ? (rec as any).value
                : null;
        if (bpm === null || !Number.isFinite(bpm)) continue;
        const prev = hrStatsByDay.get(key) ?? { sum: 0, count: 0, min: bpm, max: bpm };
        prev.sum += bpm;
        prev.count += 1;
        prev.min = Math.min(prev.min, bpm);
        prev.max = Math.max(prev.max, bpm);
        hrStatsByDay.set(key, prev);
      }
    }

    const restingByDay = new Map<string, { sum: number; count: number }>();
    for (const rec of (restingRes as any)?.records ?? []) {
      const t = safeDate((rec as any).time) ?? safeDate((rec as any).startTime) ?? safeDate((rec as any).endTime);
      if (!t) continue;
      const key = dayKeyFromDate(t);
      const bpm =
        typeof (rec as any).beatsPerMinute === 'number'
          ? (rec as any).beatsPerMinute
          : typeof (rec as any).bpm === 'number'
            ? (rec as any).bpm
            : typeof (rec as any).value === 'number'
              ? (rec as any).value
              : null;
      if (bpm === null || !Number.isFinite(bpm)) continue;
      const prev = restingByDay.get(key) ?? { sum: 0, count: 0 };
      prev.sum += bpm;
      prev.count += 1;
      restingByDay.set(key, prev);
    }

    const hrvByDay = new Map<string, { sum: number; count: number }>();
    for (const rec of (hrvRes as any)?.records ?? []) {
      const t = safeDate((rec as any).time) ?? safeDate((rec as any).startTime) ?? safeDate((rec as any).endTime);
      if (!t) continue;
      const key = dayKeyFromDate(t);
      const ms =
        typeof (rec as any).heartRateVariabilityMillis === 'number'
          ? (rec as any).heartRateVariabilityMillis
          : typeof (rec as any).rmssd === 'number'
            ? (rec as any).rmssd
            : typeof (rec as any).value === 'number'
              ? (rec as any).value
              : null;
      if (ms === null || !Number.isFinite(ms)) continue;
      const prev = hrvByDay.get(key) ?? { sum: 0, count: 0 };
      prev.sum += ms;
      prev.count += 1;
      hrvByDay.set(key, prev);
    }

    const allKeys = new Set<string>([...hrStatsByDay.keys(), ...restingByDay.keys(), ...hrvByDay.keys()]);
    return Array.from(allKeys)
      .map((key) => {
        const hr = hrStatsByDay.get(key);
        const resting = restingByDay.get(key);
        const hrv = hrvByDay.get(key);
        return {
          date: dateFromDayKey(key),
          avgHeartRateBpm: hr?.count ? Math.round((hr.sum / hr.count) * 10) / 10 : null,
          minHeartRateBpm: hr?.count ? hr.min : null,
          maxHeartRateBpm: hr?.count ? hr.max : null,
          restingHeartRateBpm: resting?.count ? Math.round((resting.sum / resting.count) * 10) / 10 : null,
          hrvRmssdMs: hrv?.count ? Math.round((hrv.sum / hrv.count) * 10) / 10 : null,
        } satisfies DailyVitals;
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  } catch (error) {
    logger.warn('[HealthConnect] readRecords vitals failed', error);
    return [];
  }
}

export async function healthConnectGetTodayVitals(): Promise<DailyVitals | null> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = await healthConnectGetDailyVitals(1);
  const match = days.find((d) => {
    const x = new Date(d.date);
    x.setHours(0, 0, 0, 0);
    return x.getTime() === today.getTime();
  });
  return match ?? null;
}

/** Domain type for a mindfulness session read from Health Connect (meditation, breathing, etc.). */
export type MindfulnessSessionFromHC = {
  startTime: Date;
  endTime: Date;
  durationSec: number;
  sessionType?: string;
  title?: string;
  notes?: string;
  source: 'health_connect';
};

export async function healthConnectGetMindfulnessSessions(days = 30): Promise<MindfulnessSessionFromHC[]> {
  const hasPerms = await healthConnectHasPermissions(['mindfulness']);
  if (!hasPerms) return [];

  const ready = await ensureInitialized();
  if (!ready) return [];

  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  try {
    const response = await readRecords('MindfulnessSession', {
      timeRangeFilter: {
        operator: 'between',
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      },
      ascendingOrder: false,
    });

    const records = (response as any)?.records ?? [];
    const sessions: MindfulnessSessionFromHC[] = [];

    for (const rec of records) {
      const startTime = safeDate((rec as any).startTime ?? (rec as any).start_time);
      const endTime = safeDate((rec as any).endTime ?? (rec as any).end_time);
      if (!startTime || !endTime || endTime <= startTime) continue;

      const durationSec = Math.max(0, Math.round((endTime.getTime() - startTime.getTime()) / 1000));
      const sessionType =
        typeof (rec as any).sessionType === 'string'
          ? (rec as any).sessionType
          : typeof (rec as any).type === 'number'
            ? String((rec as any).type)
            : undefined;
      const title = typeof (rec as any).title === 'string' ? (rec as any).title : undefined;
      const notes = typeof (rec as any).notes === 'string' ? (rec as any).notes : undefined;

      sessions.push({
        startTime,
        endTime,
        durationSec,
        sessionType,
        title,
        notes,
        source: 'health_connect',
      });
    }

    return sessions.sort((a, b) => b.endTime.getTime() - a.endTime.getTime());
  } catch (error) {
    logger.warn('[HealthConnect] readRecords MindfulnessSession failed', error);
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

  const durationMinutes = Math.max(
    0,
    Math.round((endTime.getTime() - startTime.getTime()) / 60000),
  );

  // Stage-duration summaries (in minutes)
  let deepSleepMinutes = 0;
  let remSleepMinutes = 0;
  let lightSleepMinutes = 0;
  let awakeMinutes = 0;

  for (const seg of stages) {
    const minutes = Math.max(0, (seg.end.getTime() - seg.start.getTime()) / 60000);
    switch (seg.stage) {
      case 'deep':
        deepSleepMinutes += minutes;
        break;
      case 'rem':
        remSleepMinutes += minutes;
        break;
      case 'light':
        lightSleepMinutes += minutes;
        break;
      case 'awake':
        awakeMinutes += minutes;
        break;
      default:
        break;
    }
  }

  // Compute efficiency as fraction (0–1) when stage data is available
  const totalMinutes = Math.max(1, durationMinutes);
  const efficiency =
    stages.length > 0
      ? (() => {
          const ratio = (totalMinutes - awakeMinutes) / totalMinutes;
          return Number.isFinite(ratio) ? Math.max(0, Math.min(1, ratio)) : undefined;
        })()
      : undefined;

  // Simple session classification: treat longer blocks as "main", shorter as "nap"
  const sessionType: NonNullable<SleepSession['metadata']>['sessionType'] =
    durationMinutes >= 90 ? 'main' : durationMinutes > 0 ? 'nap' : 'other';

  const device =
    (record as any)?.metadata?.dataOrigin?.packageName ||
    (record as any)?.metadata?.dataOrigin?.package ||
    (record as any)?.metadata?.dataOrigin ||
    undefined;

  const metadata = {
    deepSleepMinutes: Math.round(deepSleepMinutes),
    remSleepMinutes: Math.round(remSleepMinutes),
    lightSleepMinutes: Math.round(lightSleepMinutes),
    awakeMinutes: Math.round(awakeMinutes),
    sessionType,
    device: typeof device === 'string' ? device : undefined,
  };

  return {
    startTime,
    endTime,
    durationMinutes,
    efficiency,
    stages,
    source: 'health_connect',
    metadata,
  };
}

type WindowStats = {
  hrSum: number;
  hrCount: number;
  hrMin: number;
  hrMax: number;
  hrvSum: number;
  hrvCount: number;
  respSum: number;
  respCount: number;
  spo2Sum: number;
  spo2Count: number;
  spo2Min: number;
  tempSum: number;
  tempCount: number;
};

function createWindowStats(): WindowStats {
  return {
    hrSum: 0,
    hrCount: 0,
    hrMin: Number.POSITIVE_INFINITY,
    hrMax: Number.NEGATIVE_INFINITY,
    hrvSum: 0,
    hrvCount: 0,
    respSum: 0,
    respCount: 0,
    spo2Sum: 0,
    spo2Count: 0,
    spo2Min: Number.POSITIVE_INFINITY,
    tempSum: 0,
    tempCount: 0,
  };
}

function attachWindowVitals(sessions: SleepSession[], points: Array<{ time: Date; kind: keyof WindowStats; value: number }>) {
  if (!sessions.length || !points.length) return;

  const sortedSessions = [...sessions].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  const statsBySession = new Map<SleepSession, WindowStats>();

  let i = 0;
  for (const p of points) {
    const t = p.time.getTime();
    while (i < sortedSessions.length && t > sortedSessions[i].endTime.getTime()) i += 1;
    if (i >= sortedSessions.length) break;
    const s = sortedSessions[i];
    if (t < s.startTime.getTime() || t > s.endTime.getTime()) continue;
    const st = statsBySession.get(s) ?? createWindowStats();

    switch (p.kind) {
      case 'hrSum':
        st.hrSum += p.value;
        st.hrCount += 1;
        st.hrMin = Math.min(st.hrMin, p.value);
        st.hrMax = Math.max(st.hrMax, p.value);
        break;
      case 'hrvSum':
        st.hrvSum += p.value;
        st.hrvCount += 1;
        break;
      case 'respSum':
        st.respSum += p.value;
        st.respCount += 1;
        break;
      case 'spo2Sum':
        st.spo2Sum += p.value;
        st.spo2Count += 1;
        st.spo2Min = Math.min(st.spo2Min, p.value);
        break;
      case 'tempSum':
        st.tempSum += p.value;
        st.tempCount += 1;
        break;
      default:
        break;
    }

    statsBySession.set(s, st);
  }

  for (const s of sessions) {
    const st = statsBySession.get(s);
    if (!st) continue;
    const md = (s.metadata ??= {});

    if (st.hrCount > 0) {
      md.avgHeartRate = Math.round((st.hrSum / st.hrCount) * 10) / 10;
      md.minHeartRate = Math.round(st.hrMin * 10) / 10;
      md.maxHeartRate = Math.round(st.hrMax * 10) / 10;
    }
    if (st.hrvCount > 0) {
      md.hrvRmssdMs = Math.round((st.hrvSum / st.hrvCount) * 10) / 10;
    }
    if (st.respCount > 0) {
      md.avgRespiratoryRate = Math.round((st.respSum / st.respCount) * 10) / 10;
    }
    if (st.spo2Count > 0) {
      md.avgSpO2 = Math.round((st.spo2Sum / st.spo2Count) * 10) / 10;
      md.minSpO2 = Math.round(st.spo2Min * 10) / 10;
    }
    if (st.tempCount > 0) {
      const temp = Math.round((st.tempSum / st.tempCount) * 10) / 10;
      md.bodyTemperature = temp;
      if (md.skinTemperature == null) md.skinTemperature = temp;
    }
  }
}

async function enrichSleepSessionsWithVitals(sessions: SleepSession[]): Promise<void> {
  if (!sessions.length) return;

  const hasPerms = await healthConnectHasPermissions([
    'heart_rate',
    'heart_rate_variability',
    'respiratory_rate',
    'oxygen_saturation',
    'body_temperature',
  ]).catch(() => false);
  if (!hasPerms) return;

  const ready = await ensureInitialized();
  if (!ready) return;

  const sorted = [...sessions].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  const MIN_CHUNK_DAYS = 30;

  let chunkStartIdx = 0;
  while (chunkStartIdx < sorted.length) {
    const chunkStart = sorted[chunkStartIdx].startTime;
    const chunkEnd = new Date(chunkStart);
    chunkEnd.setDate(chunkEnd.getDate() + MIN_CHUNK_DAYS);

    let chunkEndIdx = chunkStartIdx;
    while (chunkEndIdx < sorted.length && sorted[chunkEndIdx].startTime.getTime() < chunkEnd.getTime()) {
      chunkEndIdx += 1;
    }
    const chunkSessions = sorted.slice(chunkStartIdx, chunkEndIdx);
    const startIso = chunkSessions[0].startTime.toISOString();
    const endIso = chunkSessions[chunkSessions.length - 1].endTime.toISOString();

    try {
      const [hrRes, hrvRes, respRes, spo2Res, tempRes] = await Promise.all([
        readRecords('HeartRate', {
          timeRangeFilter: { operator: 'between', startTime: startIso, endTime: endIso },
          ascendingOrder: true,
        }).catch(() => ({ records: [] } as any)),
        readRecords('HeartRateVariabilityRmssd', {
          timeRangeFilter: { operator: 'between', startTime: startIso, endTime: endIso },
          ascendingOrder: true,
        }).catch(() => ({ records: [] } as any)),
        readRecords('RespiratoryRate', {
          timeRangeFilter: { operator: 'between', startTime: startIso, endTime: endIso },
          ascendingOrder: true,
        }).catch(() => ({ records: [] } as any)),
        readRecords('OxygenSaturation', {
          timeRangeFilter: { operator: 'between', startTime: startIso, endTime: endIso },
          ascendingOrder: true,
        }).catch(() => ({ records: [] } as any)),
        readRecords('BodyTemperature', {
          timeRangeFilter: { operator: 'between', startTime: startIso, endTime: endIso },
          ascendingOrder: true,
        }).catch(() => ({ records: [] } as any)),
      ]);

      const points: Array<{ time: Date; kind: keyof WindowStats; value: number }> = [];

      for (const rec of (hrRes as any)?.records ?? []) {
        const samples = Array.isArray((rec as any).samples) ? (rec as any).samples : null;
        if (samples?.length) {
          for (const s of samples) {
            const t = safeDate((s as any).time) ?? safeDate((rec as any).startTime);
            if (!t) continue;
            const bpm =
              typeof (s as any).beatsPerMinute === 'number'
                ? (s as any).beatsPerMinute
                : typeof (s as any).bpm === 'number'
                  ? (s as any).bpm
                  : typeof (s as any).value === 'number'
                    ? (s as any).value
                    : null;
            if (bpm === null || !Number.isFinite(bpm)) continue;
            points.push({ time: t, kind: 'hrSum', value: bpm });
          }
        } else {
          const t = safeDate((rec as any).time) ?? safeDate((rec as any).startTime) ?? safeDate((rec as any).endTime);
          if (!t) continue;
          const bpm =
            typeof (rec as any).beatsPerMinute === 'number'
              ? (rec as any).beatsPerMinute
              : typeof (rec as any).bpm === 'number'
                ? (rec as any).bpm
                : typeof (rec as any).value === 'number'
                  ? (rec as any).value
                  : null;
          if (bpm === null || !Number.isFinite(bpm)) continue;
          points.push({ time: t, kind: 'hrSum', value: bpm });
        }
      }

      for (const rec of (hrvRes as any)?.records ?? []) {
        const t = safeDate((rec as any).time) ?? safeDate((rec as any).startTime) ?? safeDate((rec as any).endTime);
        if (!t) continue;
        const ms =
          typeof (rec as any).heartRateVariabilityMillis === 'number'
            ? (rec as any).heartRateVariabilityMillis
            : typeof (rec as any).rmssd === 'number'
              ? (rec as any).rmssd
              : typeof (rec as any).value === 'number'
                ? (rec as any).value
                : null;
        if (ms === null || !Number.isFinite(ms)) continue;
        points.push({ time: t, kind: 'hrvSum', value: ms });
      }

      for (const rec of (respRes as any)?.records ?? []) {
        const t = safeDate((rec as any).time) ?? safeDate((rec as any).startTime) ?? safeDate((rec as any).endTime);
        if (!t) continue;
        const bpm =
          typeof (rec as any).rate === 'number'
            ? (rec as any).rate
            : typeof (rec as any).breathsPerMinute === 'number'
              ? (rec as any).breathsPerMinute
              : typeof (rec as any).value === 'number'
                ? (rec as any).value
                : null;
        if (bpm === null || !Number.isFinite(bpm)) continue;
        points.push({ time: t, kind: 'respSum', value: bpm });
      }

      for (const rec of (spo2Res as any)?.records ?? []) {
        const t = safeDate((rec as any).time) ?? safeDate((rec as any).startTime) ?? safeDate((rec as any).endTime);
        if (!t) continue;
        const pObj = (rec as any).percentage;
        const pct =
          typeof (rec as any).percentage === 'number'
            ? (rec as any).percentage
            : typeof pObj?.value === 'number'
              ? pObj.value
              : typeof pObj?.inPercent === 'number'
                ? pObj.inPercent
                : typeof (rec as any).oxygenSaturation === 'number'
                  ? (rec as any).oxygenSaturation
                  : typeof (rec as any).value === 'number'
                    ? (rec as any).value
                    : null;
        if (pct === null || !Number.isFinite(pct)) continue;
        points.push({ time: t, kind: 'spo2Sum', value: pct });
      }

      for (const rec of (tempRes as any)?.records ?? []) {
        const t = safeDate((rec as any).time) ?? safeDate((rec as any).startTime) ?? safeDate((rec as any).endTime);
        if (!t) continue;
        const tempObj = (rec as any).temperature;
        const c =
          typeof (rec as any).temperature === 'number'
            ? (rec as any).temperature
            : typeof tempObj?.inCelsius === 'number'
              ? tempObj.inCelsius
              : typeof tempObj?.celsius === 'number'
                ? tempObj.celsius
                : typeof (rec as any).value === 'number'
                  ? (rec as any).value
                  : null;
        if (c === null || !Number.isFinite(c)) continue;
        points.push({ time: t, kind: 'tempSum', value: c });
      }

      attachWindowVitals(chunkSessions, points);
    } catch (e) {
      logger.warn('[HealthConnect] sleep vitals enrichment failed', e);
    }

    chunkStartIdx = chunkEndIdx;
  }
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

