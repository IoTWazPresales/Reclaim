import { Platform } from 'react-native';
import { logger } from './logger';

/** Shared types your UI uses */
export type SleepStage =
  | 'awake'
  | 'light'
  | 'deep'
  | 'rem'
  | 'unknown';

export type SleepStageSegment = {
  start: string;  // ISO
  end: string;    // ISO
  stage: SleepStage;
};

export type SleepSession = {
  startTime: string;     // ISO
  endTime: string;       // ISO
  durationMin: number;   // total minutes
  efficiency?: number | null; // 0..1 if available
  stages?: SleepStageSegment[] | null;
};

/** Package handle (optional). We keep code resilient if package is absent. */
let hc: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  hc = require('react-native-health-connect');
} catch {
  hc = null;
}

/** Check if HC is available on this device (Android 10+) */
export async function isHealthConnectAvailable(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (!hc?.isAvailable) return false;
  try {
    return await hc.isAvailable();
  } catch {
    return false;
  }
}

/** Request (or verify) permission to read sleep data */
export async function ensureSleepPermission(): Promise<boolean> {
  if (Platform.OS !== 'android' || !hc) return false;

  const PERMS = [
    { accessType: 'read', recordType: 'com.google.sleep.session' },
    { accessType: 'read', recordType: 'com.google.sleep.stage' },
  ];

  try {
    const granted = await hc.requestPermission(PERMS);
    // granted: [{ recordType, accessType, granted: boolean }]
    return Array.isArray(granted) && granted.every((g: any) => g.granted === true);
  } catch {
    return false;
  }
}

/** Internal: convert millis to ISO string */
function msToIso(ms: number) {
  return new Date(ms).toISOString();
}
export async function getLastSleepEndISO(): Promise<string | null> {
  const last = await getLastSleepSession();
  return last?.endTime ?? null;
}

/** Read the most recent Sleep Session (and stages if available). */
export async function getLastSleepSession(): Promise<SleepSession | null> {
  if (Platform.OS !== 'android' || !hc) return null;

  const available = await isHealthConnectAvailable();
  if (!available) return null;

  // We’ll search last 3 days for safety
  const end = Date.now();
  const start = end - 3 * 24 * 60 * 60 * 1000;

  try {
    // 1) Read sessions
    const sessions: any[] = await hc.readRecords('com.google.sleep.session', {
      timeRangeFilter: { operator: 'between', startTime: msToIso(start), endTime: msToIso(end) },
      ascendingOrder: false, // newest first if supported
      pageSize: 50,
    });

    if (!sessions?.length) return null;
    // Sort newest by endTime, pick last night-ish
    sessions.sort((a, b) => +new Date(b.endTime) - +new Date(a.endTime));
    const ses = sessions[0];

    // 2) Read stages within that window
    let stages: SleepStageSegment[] | null = null;
    try {
      const stageRows: any[] = await hc.readRecords('com.google.sleep.stage', {
        timeRangeFilter: { operator: 'between', startTime: ses.startTime, endTime: ses.endTime },
        pageSize: 200,
      });
      stages = (stageRows ?? []).map((r: any) => ({
        start: r.startTime,
        end: r.endTime,
        stage: normalizeStage(r.stage),
      }));
    } catch {
      stages = null;
    }

    // Efficiency is not always present; some vendors provide it
    const durationMin = Math.max(
      0,
      Math.round((+new Date(ses.endTime) - +new Date(ses.startTime)) / 60000)
    );

    const out: SleepSession = {
      startTime: ses.startTime,
      endTime: ses.endTime,
      durationMin,
      efficiency: typeof ses.efficiency === 'number' ? ses.efficiency : null,
      stages,
    };
    return out;
  } catch (e) {
    logger.warn('[HC] getLastSleepSession failed:', (e as any)?.message ?? e);
    return null;
  }
}

/** Map HC stage constants to our narrowed set */
function normalizeStage(v: string): SleepStage {
  const x = (v || '').toLowerCase();
  if (x.includes('awake')) return 'awake';
  if (x.includes('rem')) return 'rem';
  if (x.includes('deep')) return 'deep';
  if (x.includes('light')) return 'light';
  return 'unknown';
}
export async function getSleepSessions(
  days: number = 7
): Promise<SleepSession[]> {
  if (Platform.OS !== 'android' || !hc) return [];

  const available = await isHealthConnectAvailable();
  if (!available) return [];

  const end = Date.now();
  const start = end - days * 24 * 60 * 60 * 1000;

  try {
    const sessions: any[] = await hc.readRecords('com.google.sleep.session', {
      timeRangeFilter: { operator: 'between', startTime: msToIso(start), endTime: msToIso(end) },
      ascendingOrder: true,
      pageSize: 200,
    });

    return sessions.map((s) => ({
      startTime: s.startTime,
      endTime: s.endTime,
      durationMin: Math.max(
        0,
        Math.round((+new Date(s.endTime) - +new Date(s.startTime)) / 60000)
      ),
      efficiency: typeof s.efficiency === 'number' ? s.efficiency : null,
      stages: null,
    }));
  } catch (e) {
    logger.warn('[HC] getSleepSessions failed:', (e as any)?.message ?? e);
    return [];
  }
}