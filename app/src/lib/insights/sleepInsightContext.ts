/**
 * Sleep → InsightContext slice only. Keeps heavy `contextBuilder` / API imports out of unit tests.
 */
import type { SleepSession } from '@/lib/api';
import type { InsightContext } from './InsightEngine';

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;

function average(values: number[]): number | undefined {
  if (!values.length) return undefined;
  const total = values.reduce((sum, v) => sum + v, 0);
  return total / values.length;
}

/** Exported for sleep baseline hours in `contextBuilder` (same semantics as prior local helper). */
export function sleepSessionDurationHours(session: SleepSession): number | undefined {
  if (!session?.start_time || !session?.end_time) return undefined;
  const start = new Date(session.start_time).getTime();
  const end = new Date(session.end_time).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return undefined;
  return (end - start) / MS_PER_HOUR;
}

function getMidpointMinutes(session: SleepSession): number | undefined {
  if (!session?.start_time || !session?.end_time) return undefined;
  const start = new Date(session.start_time).getTime();
  const end = new Date(session.end_time).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return undefined;
  const midpoint = new Date(start + (end - start) / 2);
  return midpoint.getHours() * 60 + midpoint.getMinutes();
}

function circularAbsDeltaMinutes(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return Math.min(diff, 1440 - diff);
}

function circularSignedDeltaMinutes(a: number, b: number): number {
  const raw = a - b;
  return ((raw + 720) % 1440) - 720;
}

const SLEEP_TARGET_HOURS = 8;

function normaliseQuality(raw: number | null | undefined): number | undefined {
  if (raw == null) return undefined;
  return raw <= 1 ? Math.round(raw * 100) : Math.round(raw);
}

function normaliseEfficiency(raw: number | null | undefined): number | undefined {
  if (raw == null) return undefined;
  return raw <= 1 ? Math.round(raw * 100) : Math.round(raw);
}

function pickMetaNumber(md: Record<string, unknown> | null | undefined, camel: string, snake: string): number | undefined {
  if (!md) return undefined;
  const a = md[camel];
  const b = md[snake];
  const v = (typeof a === 'number' ? a : undefined) ?? (typeof b === 'number' ? b : undefined);
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

/**
 * Sleep slice for the insight engine: last night + 7d aggregates from stored sessions.
 */
export function buildSleepInsightContext(sessions: SleepSession[]): InsightContext['sleep'] {
  if (!sessions.length) return undefined;

  const sorted = [...sessions].sort((a, b) => new Date(b.end_time).getTime() - new Date(a.end_time).getTime());

  const latest = sorted[0];
  const latestDuration = latest ? sleepSessionDurationHours(latest) : undefined;

  const quality = normaliseQuality(latest?.quality);
  const efficiency = normaliseEfficiency(latest?.efficiency);
  const md = latest?.metadata as Record<string, unknown> | undefined;
  const deepMinutes = pickMetaNumber(md, 'deepSleepMinutes', 'deep_sleep_minutes');
  const remMinutes = pickMetaNumber(md, 'remSleepMinutes', 'rem_sleep_minutes');
  const skinFromSkin = pickMetaNumber(md, 'skinTemperature', 'skin_temperature');
  const skinFromBody = pickMetaNumber(md, 'bodyTemperature', 'body_temperature');
  const skinTempC = skinFromSkin ?? skinFromBody;
  const hrvRmssdMs = pickMetaNumber(md, 'hrvRmssdMs', 'hrv_rmssd_ms');
  const avgSpO2 = pickMetaNumber(md, 'avgSpO2', 'avg_spo2');
  const avgRespiratoryRate = pickMetaNumber(md, 'avgRespiratoryRate', 'avg_respiratory_rate');
  const avgHeartRate = pickMetaNumber(md, 'avgHeartRate', 'avg_heart_rate');
  const minHeartRate = pickMetaNumber(md, 'minHeartRate', 'min_heart_rate');
  const maxHeartRate = pickMetaNumber(md, 'maxHeartRate', 'max_heart_rate');

  const lastNight =
    latestDuration !== undefined
      ? {
          hours: Number(latestDuration.toFixed(2)),
          ...(quality !== undefined ? { quality } : {}),
          ...(efficiency !== undefined ? { efficiency } : {}),
          ...(deepMinutes !== undefined ? { deepMinutes } : {}),
          ...(remMinutes !== undefined ? { remMinutes } : {}),
          ...(skinTempC !== undefined ? { skinTempC: Number(skinTempC.toFixed(2)) } : {}),
          ...(hrvRmssdMs !== undefined ? { hrvRmssdMs: Math.round(hrvRmssdMs) } : {}),
          ...(avgSpO2 !== undefined ? { avgSpO2: Number(avgSpO2.toFixed(1)) } : {}),
          ...(avgRespiratoryRate !== undefined
            ? { avgRespiratoryRate: Number(avgRespiratoryRate.toFixed(1)) }
            : {}),
          ...(avgHeartRate !== undefined ? { avgHeartRate: Math.round(avgHeartRate) } : {}),
          ...(minHeartRate !== undefined ? { minHeartRate: Math.round(minHeartRate) } : {}),
          ...(maxHeartRate !== undefined ? { maxHeartRate: Math.round(maxHeartRate) } : {}),
        }
      : undefined;

  const durations = sorted
    .slice(0, 7)
    .map((s) => sleepSessionDurationHours(s))
    .filter((v): v is number => v !== undefined);

  const avgDuration = average(durations);

  const debtHours =
    durations.length > 0
      ? Number(Math.max(0, durations.reduce((acc, h) => acc + Math.max(0, SLEEP_TARGET_HOURS - h), 0)).toFixed(2))
      : undefined;

  const midpoints = sorted.map((s) => getMidpointMinutes(s)).filter((v): v is number => v !== undefined);

  const latestMidpoint = latest ? getMidpointMinutes(latest) : undefined;
  const baselineMidpoint =
    midpoints.length > 1 ? average(midpoints.slice(1, Math.min(midpoints.length, 8))) : undefined;

  const absDelta =
    latestMidpoint !== undefined && baselineMidpoint !== undefined
      ? circularAbsDeltaMinutes(latestMidpoint, baselineMidpoint)
      : undefined;

  const signedDelta =
    latestMidpoint !== undefined && baselineMidpoint !== undefined
      ? circularSignedDeltaMinutes(latestMidpoint, baselineMidpoint)
      : undefined;

  return {
    lastNight: lastNight ?? undefined,
    avg7d: avgDuration !== undefined ? { hours: Number(avgDuration.toFixed(2)) } : undefined,
    midpoint:
      absDelta !== undefined
        ? {
            deltaMin: absDelta,
            ...(signedDelta !== undefined ? { signedDeltaMin: signedDelta } : {}),
          }
        : undefined,
    ...(debtHours !== undefined ? { debtHours } : {}),
  };
}
