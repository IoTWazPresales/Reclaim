/**
 * Shared mapper: converts a Supabase sleep_sessions row into the
 * canonical HealthSleepSession shape used across the app.
 *
 * Consolidates the duplicate mappers that previously lived in
 * Dashboard.tsx (mapSleepRowToHealthSession) and
 * SleepScreen.tsx (mapDbSleepSessionToHealth).
 */
import type { SleepSession as DbSleepSession } from '@/lib/api';
import type { SleepSession as HealthSleepSession } from '@/lib/health/types';

const SOURCE_MAP: Record<DbSleepSession['source'], HealthSleepSession['source']> = {
  healthkit: 'apple_healthkit',
  googlefit: 'google_fit',
  healthconnect: 'health_connect',
  samsung_health: 'samsung_health',
  phone_infer: 'unknown',
  manual: 'unknown',
};

function safeDate(input: unknown): Date | null {
  if (!input) return null;
  const d =
    input instanceof Date
      ? input
      : typeof input === 'string' || typeof input === 'number'
        ? new Date(input)
        : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  return d;
}

export function mapDbSleepToHealth(row: DbSleepSession): HealthSleepSession {
  let stages: HealthSleepSession['stages'] | undefined;
  try {
    const raw = typeof row.stages === 'string' ? JSON.parse(row.stages) : row.stages;
    if (Array.isArray(raw)) {
      stages = raw.map((s: any) => ({
        start: new Date(s.start),
        end: new Date(s.end),
        stage: s.stage ?? 'unknown',
      }));
    } else if (raw && typeof raw === 'object') {
      stages = Object.entries(raw).map(([stage, minutes]) => ({
        stage: stage ?? 'unknown',
        minutes: typeof minutes === 'number' ? minutes : undefined,
      })) as any;
    }
  } catch {
    stages = undefined;
  }

  let efficiency: number | undefined =
    typeof row.efficiency === 'number'
      ? row.efficiency
      : typeof row.efficiency === 'string'
        ? parseFloat(row.efficiency)
        : undefined;

  if (
    (efficiency === undefined || !Number.isFinite(efficiency)) &&
    typeof (row as any).awake_minutes === 'number' &&
    typeof (row as any).duration_minutes === 'number' &&
    (row as any).duration_minutes > 0
  ) {
    const dur = (row as any).duration_minutes as number;
    const awake = (row as any).awake_minutes as number;
    efficiency = Math.max(0, Math.min(1, (dur - awake) / dur));
  }

  const quality =
    typeof (row as any)?.quality === 'number'
      ? (row as any).quality
      : typeof (row as any)?.quality === 'string'
        ? parseFloat((row as any).quality)
        : undefined;

  const st = safeDate(row.start_time) ?? new Date(NaN);
  const en = safeDate(row.end_time) ?? new Date(NaN);
  const computedDuration =
    safeDate(row.start_time) && safeDate(row.end_time)
      ? Math.max(0, (en.getTime() - st.getTime()) / 60000)
      : 0;

  return {
    startTime: st,
    endTime: en,
    durationMinutes: row.duration_minutes ?? computedDuration,
    efficiency: efficiency ?? undefined,
    stages,
    source: SOURCE_MAP[row.source] ?? 'unknown',
    metadata: {
      ...(row.metadata ?? undefined),
      ...(quality !== undefined ? { quality } : {}),
    },
  };
}
