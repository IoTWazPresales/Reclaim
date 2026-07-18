/**
 * Sleep → InsightContext slice only. Keeps heavy `contextBuilder` / API imports out of unit tests.
 */
import type { SleepSession } from '@/lib/api';
import type { InsightContext } from './InsightEngine';
import {
  selectPrimaryNight,
  selectPrimaryNightsForAverage,
  sleepSessionDurationHours,
  sleepSessionMidpointMinutes,
} from './selectPrimaryNight';

export { sleepSessionDurationHours } from './selectPrimaryNight';

function average(values: number[]): number | undefined {
  if (!values.length) return undefined;
  const total = values.reduce((sum, v) => sum + v, 0);
  return total / values.length;
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
 * "Last night" is the primary night bout — not the latest session by end_time (naps excluded).
 */
export function buildSleepInsightContext(sessions: SleepSession[]): InsightContext['sleep'] {
  if (!sessions.length) return undefined;

  const primary = selectPrimaryNight(sessions);
  const latest = primary?.session;
  const latestDuration = primary?.hours;

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
    latest && latestDuration !== undefined
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

  const primaryNights = selectPrimaryNightsForAverage(sessions, 7);
  const durations = primaryNights.map((p) => p.hours);

  const avgDuration = average(durations);

  const debtHours =
    durations.length > 0
      ? Number(Math.max(0, durations.reduce((acc, h) => acc + Math.max(0, SLEEP_TARGET_HOURS - h), 0)).toFixed(2))
      : undefined;

  const midpoints = primaryNights
    .map((p) => sleepSessionMidpointMinutes(p.session))
    .filter((v): v is number => v !== undefined);

  const latestMidpoint = latest ? sleepSessionMidpointMinutes(latest) : undefined;
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

  if (!lastNight && avgDuration === undefined && absDelta === undefined && debtHours === undefined) {
    return undefined;
  }

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
