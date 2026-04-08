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
  'steps',
  'active_energy',
  'heart_rate',
  'resting_heart_rate',
  'heart_rate_variability',
  'oxygen_saturation',
  'respiratory_rate',
  'body_temperature',
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
  oxygen_saturation: ['OxygenSaturation'],
  respiratory_rate: ['RespiratoryRate'],
  body_temperature: ['BodyTemperature'],
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
      .filter((session): session is SleepSession => session !== null);

    await enrichSleepSessionsWithVitals(sessions);
    classifySleepSessionsByNight(sessions);

    return sessions.sort((a, b) => b.endTime.getTime() - a.endTime.getTime());
  } catch (error) {
    logger.warn('[HealthConnect] readRecords failed', error);
    return [];
  }
}

/** One calendar day of aggregated HR / HRV from Health Connect (Android). */
export type HealthConnectDailyVitals = {
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

export type HealthConnectSessionEnergyResult = {
  /** Prorated sum of active calories (kcal) overlapping [startedAt, endedAt], or null if unavailable. */
  activeCaloriesKcal: number | null;
  source: 'health_connect' | null;
};

function extractKcalFromEnergyRecord(rec: any): number {
  const energyObj = rec?.energy;
  const cals =
    typeof rec?.calories === 'number'
      ? rec.calories
      : typeof energyObj?.inCalories === 'number'
        ? energyObj.inCalories
        : typeof energyObj?.calories === 'number'
          ? energyObj.calories
          : typeof rec?.value === 'number'
            ? rec.value
            : 0;
  return Number.isFinite(cals) ? cals : 0;
}

/** Sum active calories for records overlapping the window; prorate by overlap duration when interval bounds exist. */
function sumActiveCaloriesOverlappingWindow(records: unknown[], windowStart: Date, windowEnd: Date): number {
  const w0 = windowStart.getTime();
  const w1 = windowEnd.getTime();
  if (!Number.isFinite(w0) || !Number.isFinite(w1) || w1 <= w0) return 0;

  let sum = 0;
  for (const rec of records ?? []) {
    const r = rec as any;
    const rs = safeDate(r.startTime) ?? safeDate(r.time);
    const re = safeDate(r.endTime) ?? rs;
    if (!rs) continue;
    const a = rs.getTime();
    const b = (re ?? rs).getTime();
    const overlap0 = Math.max(a, w0);
    const overlap1 = Math.min(b, w1);
    if (overlap1 <= overlap0) continue;

    const cals = extractKcalFromEnergyRecord(r);
    if (cals <= 0) continue;

    const recordMs = Math.max(1, b - a);
    const overlapMs = overlap1 - overlap0;
    sum += cals * (overlapMs / recordMs);
  }
  return Math.round(sum * 10) / 10;
}

/**
 * Active energy (kcal) attributed to a wall-clock interval, e.g. a training session.
 * Android + Health Connect only. Returns null if HC unavailable, uninitialized, or permissions missing.
 */
export async function healthConnectGetActiveEnergyForSessionWindow(
  startedAt: Date | string,
  endedAt: Date | string,
): Promise<HealthConnectSessionEnergyResult> {
  if (Platform.OS !== 'android') {
    return { activeCaloriesKcal: null, source: null };
  }

  const start = typeof startedAt === 'string' ? new Date(startedAt) : startedAt;
  const end = typeof endedAt === 'string' ? new Date(endedAt) : endedAt;
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
    return { activeCaloriesKcal: null, source: null };
  }

  const hasPerms = await healthConnectHasPermissions(['active_energy']);
  if (!hasPerms) {
    return { activeCaloriesKcal: null, source: null };
  }

  const ready = await ensureInitialized();
  if (!ready) {
    return { activeCaloriesKcal: null, source: null };
  }

  const startISO = start.toISOString();
  const endISO = end.toISOString();

  try {
    let res = await readRecords('ActiveCaloriesBurned', {
      timeRangeFilter: { operator: 'between', startTime: startISO, endTime: endISO },
      ascendingOrder: false,
    }).catch(() => ({ records: [] } as any));

    let records = (res as any)?.records ?? [];
    if (!records.length) {
      res = await readRecords('TotalCaloriesBurned', {
        timeRangeFilter: { operator: 'between', startTime: startISO, endTime: endISO },
        ascendingOrder: false,
      }).catch(() => ({ records: [] } as any));
      records = (res as any)?.records ?? [];
    }

    const total = sumActiveCaloriesOverlappingWindow(records, start, end);
    if (total <= 0) {
      return { activeCaloriesKcal: null, source: 'health_connect' };
    }
    return { activeCaloriesKcal: total, source: 'health_connect' };
  } catch (error) {
    logger.warn('[HealthConnect] session window energy read failed', error);
    return { activeCaloriesKcal: null, source: null };
  }
}

/**
 * Shallow-merge Health Connect active calories into a training session summary.
 * Used when ending a session outside the full finish flow (e.g. TrainingScreen "End & save").
 */
export async function mergeHealthConnectActiveEnergyIntoTrainingSummary(
  startedAtIso: string | null | undefined,
  endedAtIso: string,
  existingSummary: Record<string, any> | null | undefined,
): Promise<Record<string, any>> {
  const base =
    existingSummary && typeof existingSummary === 'object' && !Array.isArray(existingSummary)
      ? { ...existingSummary }
      : {};
  try {
    if (startedAtIso && endedAtIso) {
      const energy = await healthConnectGetActiveEnergyForSessionWindow(startedAtIso, endedAtIso);
      if (energy.activeCaloriesKcal != null && energy.activeCaloriesKcal > 0 && energy.source) {
        return {
          ...base,
          activeCaloriesKcal: energy.activeCaloriesKcal,
          energySource: energy.source,
          energyWindow: { start: startedAtIso, end: endedAtIso },
        };
      }
    }
  } catch (e) {
    logger.warn('[HealthConnect] merge session calories into summary skipped', e);
  }
  return base;
}

export async function healthConnectGetDailyVitals(days = 7): Promise<HealthConnectDailyVitals[]> {
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
        } satisfies HealthConnectDailyVitals;
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  } catch (error) {
    logger.warn('[HealthConnect] readRecords vitals failed', error);
    return [];
  }
}

export async function healthConnectGetTodayVitals(): Promise<HealthConnectDailyVitals | null> {
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
  
  const totalMinutes = Math.max(1, Math.round((endTime.getTime() - startTime.getTime()) / 60000));

  let deepMinutes = 0;
  let remMinutes = 0;
  let lightMinutes = 0;
  let awakeMinutes = 0;
  if (stages.length > 0) {
    for (const seg of stages) {
      const minutes = Math.max(0, (seg.end.getTime() - seg.start.getTime()) / 60000);
      switch (seg.stage) {
        case 'deep':
          deepMinutes += minutes;
          break;
        case 'rem':
          remMinutes += minutes;
          break;
        case 'light':
          lightMinutes += minutes;
          break;
        case 'awake':
          awakeMinutes += minutes;
          break;
        default:
          break;
      }
    }
  }

  const efficiency =
    stages.length > 0
      ? (() => {
          const ratio = totalMinutes > 0 ? (totalMinutes - awakeMinutes) / totalMinutes : undefined;
          return ratio !== undefined && Number.isFinite(ratio) ? Math.max(0, Math.min(1, ratio)) : undefined;
        })()
      : undefined;

  return {
    startTime,
    endTime,
    durationMinutes: Math.max(0, totalMinutes),
    efficiency,
    stages,
    source: 'health_connect',
    metadata: {
      deepSleepMinutes: deepMinutes || undefined,
      remSleepMinutes: remMinutes || undefined,
      lightSleepMinutes: lightMinutes || undefined,
      awakeMinutes: awakeMinutes || undefined,
    },
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

function sleepNightKeyFromDates(start: Date, end: Date): string {
  const endLocal = new Date(end);
  if (endLocal.getHours() < 12) {
    endLocal.setDate(endLocal.getDate() - 1);
  }
  endLocal.setHours(0, 0, 0, 0);
  return endLocal.toISOString().split('T')[0];
}

function classifySleepSessionsByNight(sessions: SleepSession[]): void {
  if (sessions.length === 0) return;

  const byNight = new Map<string, SleepSession[]>();
  for (const s of sessions) {
    const key = sleepNightKeyFromDates(s.startTime, s.endTime);
    const group = byNight.get(key) ?? [];
    group.push(s);
    byNight.set(key, group);
  }

  for (const [, group] of byNight) {
    if (!group.length) continue;
    // Longest duration in group.
    const sorted = [...group].sort(
      (a, b) => (b.durationMinutes ?? 0) - (a.durationMinutes ?? 0),
    );
    const main = sorted[0];
    main.metadata = {
      ...(main.metadata ?? {}),
      sessionType: 'main',
    };

    for (let i = 1; i < sorted.length; i += 1) {
      const s = sorted[i];
      const duration = s.durationMinutes ?? 0;
      const startHour = s.startTime.getHours();
      const endHour = s.endTime.getHours();
      const isDaytime =
        startHour >= 6 && startHour < 22 && endHour >= 6 && endHour < 22;
      const isShortNap = duration > 0 && duration <= 180; // <= 3h

      let sessionType: 'nap' | 'other' = 'other';
      if (isDaytime && isShortNap) {
        sessionType = 'nap';
      }

      s.metadata = {
        ...(s.metadata ?? {}),
        sessionType,
      };
    }
  }
}

async function enrichSleepSessionsWithVitals(sessions: SleepSession[]): Promise<void> {
  if (!sessions.length) return;

  const hasPerms = await healthConnectHasPermissions([
    'heart_rate',
    'heart_rate_variability',
    'oxygen_saturation',
    'respiratory_rate',
    'body_temperature',
  ]);
  if (!hasPerms) return;

  const ready = await ensureInitialized();
  if (!ready) return;

  for (const s of sessions) {
    const startISO = s.startTime.toISOString();
    const endISO = s.endTime.toISOString();

    try {
      const [hrRes, hrvRes, spo2Res, respRes, tempRes] = await Promise.all([
        readRecords('HeartRate', {
          timeRangeFilter: { operator: 'between', startTime: startISO, endTime: endISO },
          ascendingOrder: false,
        }).catch(() => ({ records: [] } as any)),
        readRecords('HeartRateVariabilityRmssd', {
          timeRangeFilter: { operator: 'between', startTime: startISO, endTime: endISO },
          ascendingOrder: false,
        }).catch(() => ({ records: [] } as any)),
        readRecords('OxygenSaturation', {
          timeRangeFilter: { operator: 'between', startTime: startISO, endTime: endISO },
          ascendingOrder: false,
        }).catch(() => ({ records: [] } as any)),
        readRecords('RespiratoryRate', {
          timeRangeFilter: { operator: 'between', startTime: startISO, endTime: endISO },
          ascendingOrder: false,
        }).catch(() => ({ records: [] } as any)),
        readRecords('BodyTemperature', {
          timeRangeFilter: { operator: 'between', startTime: startISO, endTime: endISO },
          ascendingOrder: false,
        }).catch(() => ({ records: [] } as any)),
      ]);

      let hrSum = 0;
      let hrCount = 0;
      let hrMin: number | null = null;
      let hrMax: number | null = null;

      for (const rec of (hrRes as any)?.records ?? []) {
        const samples = Array.isArray((rec as any).samples) ? (rec as any).samples : null;
        if (samples?.length) {
          for (const smp of samples) {
            const bpm =
              typeof (smp as any).beatsPerMinute === 'number'
                ? (smp as any).beatsPerMinute
                : typeof (smp as any).bpm === 'number'
                  ? (smp as any).bpm
                  : typeof (smp as any).value === 'number'
                    ? (smp as any).value
                    : null;
            if (bpm === null || !Number.isFinite(bpm)) continue;
            hrSum += bpm;
            hrCount += 1;
            hrMin = hrMin === null ? bpm : Math.min(hrMin, bpm);
            hrMax = hrMax === null ? bpm : Math.max(hrMax, bpm);
          }
        }
      }

      let hrvSum = 0;
      let hrvCount = 0;
      for (const rec of (hrvRes as any)?.records ?? []) {
        const ms =
          typeof (rec as any).heartRateVariabilityMillis === 'number'
            ? (rec as any).heartRateVariabilityMillis
            : typeof (rec as any).rmssd === 'number'
              ? (rec as any).rmssd
              : typeof (rec as any).value === 'number'
                ? (rec as any).value
                : null;
        if (ms === null || !Number.isFinite(ms)) continue;
        hrvSum += ms;
        hrvCount += 1;
      }

      let spo2Sum = 0;
      let spo2Count = 0;
      let spo2Min: number | null = null;
      for (const rec of (spo2Res as any)?.records ?? []) {
        const samples = Array.isArray((rec as any).samples) ? (rec as any).samples : null;
        if (samples?.length) {
          for (const smp of samples) {
            const val =
              typeof (smp as any).percentage === 'number'
                ? (smp as any).percentage
                : typeof (smp as any).value === 'number'
                  ? (smp as any).value
                  : null;
            if (val === null || !Number.isFinite(val)) continue;
            spo2Sum += val;
            spo2Count += 1;
            spo2Min = spo2Min === null ? val : Math.min(spo2Min, val);
          }
        } else {
          const val =
            typeof (rec as any).percentage === 'number'
              ? (rec as any).percentage
              : typeof (rec as any).value === 'number'
                ? (rec as any).value
                : null;
          if (val === null || !Number.isFinite(val)) continue;
          spo2Sum += val;
          spo2Count += 1;
          spo2Min = spo2Min === null ? val : Math.min(spo2Min, val);
        }
      }

      let respSum = 0;
      let respCount = 0;
      for (const rec of (respRes as any)?.records ?? []) {
        const val =
          typeof (rec as any).rate === 'number'
            ? (rec as any).rate
            : typeof (rec as any).breathsPerMinute === 'number'
              ? (rec as any).breathsPerMinute
              : typeof (rec as any).value === 'number'
                ? (rec as any).value
                : null;
        if (val === null || !Number.isFinite(val)) continue;
        respSum += val;
        respCount += 1;
      }

      let tempSum = 0;
      let tempCount = 0;
      for (const rec of (tempRes as any)?.records ?? []) {
        const obj = (rec as any).temperature ?? rec;
        const val =
          typeof obj?.inCelsius === 'number'
            ? obj.inCelsius
            : typeof obj?.celsius === 'number'
              ? obj.celsius
              : typeof (rec as any).value === 'number'
                ? (rec as any).value
                : null;
        if (val === null || !Number.isFinite(val)) continue;
        tempSum += val;
        tempCount += 1;
      }

      const avgHr = hrCount > 0 ? hrSum / hrCount : null;
      const avgHrv = hrvCount > 0 ? hrvSum / hrvCount : null;
      const avgSpO2 = spo2Count > 0 ? spo2Sum / spo2Count : null;
      const avgResp = respCount > 0 ? respSum / respCount : null;
      const avgTemp = tempCount > 0 ? tempSum / tempCount : null;

      s.metadata = {
        ...(s.metadata ?? {}),
        avgHeartRate: avgHr ?? (s.metadata?.avgHeartRate ?? undefined),
        minHeartRate: hrMin ?? (s.metadata?.minHeartRate ?? undefined),
        maxHeartRate: hrMax ?? (s.metadata?.maxHeartRate ?? undefined),
        hrvRmssdMs: avgHrv ?? (s.metadata?.hrvRmssdMs ?? undefined),
        avgSpO2: avgSpO2 ?? (s.metadata?.avgSpO2 ?? undefined),
        minSpO2: spo2Min ?? (s.metadata?.minSpO2 ?? undefined),
        avgRespiratoryRate: avgResp ?? (s.metadata?.avgRespiratoryRate ?? undefined),
        skinTemperature: avgTemp ?? (s.metadata?.skinTemperature ?? undefined),
      };
    } catch (error) {
      logger.warn('[HealthConnect] enrichSleepSessionsWithVitals failed', error);
    }
  }
}

function safeDate(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

