/**
 * Android resting-HR daily rows from overnight HeartRate samples (proxy).
 * Not clinical RestingHeartRate — overnight window of HC HeartRate.
 */
import { Platform } from 'react-native';
import { initialize, readRecords } from 'react-native-health-connect';
import { logger } from '@/lib/logger';
import { bucketRestingHrSamplesToDailyRows } from '@/lib/health/restingHrDailyRows';
import type { RestingHrTrendDailyRow } from '@/lib/health/heartRateRestingSummary';
import { healthConnectHasPermissions } from '@/lib/health/healthConnectService';

function overnightSamplesAsRestingProxy(
  records: unknown[],
): Array<{ value: number; startDate: string }> {
  const out: Array<{ value: number; startDate: string }> = [];
  for (const rec of records) {
    const samples = Array.isArray((rec as any).samples) ? (rec as any).samples : null;
    if (samples?.length) {
      for (const s of samples) {
        const t =
          typeof (s as any).time === 'string'
            ? (s as any).time
            : typeof (s as any).startTime === 'string'
              ? (s as any).startTime
              : typeof (rec as any).startTime === 'string'
                ? (rec as any).startTime
                : null;
        if (!t) continue;
        const hour = new Date(t).getHours();
        if (hour >= 7) continue;
        const bpm =
          typeof (s as any).beatsPerMinute === 'number'
            ? (s as any).beatsPerMinute
            : typeof (s as any).bpm === 'number'
              ? (s as any).bpm
              : NaN;
        if (!Number.isFinite(bpm) || bpm < 35 || bpm > 120) continue;
        out.push({ value: bpm, startDate: t });
      }
    } else {
      const t = typeof (rec as any).startTime === 'string' ? (rec as any).startTime : null;
      if (!t) continue;
      const hour = new Date(t).getHours();
      if (hour >= 7) continue;
      const bpm =
        typeof (rec as any).beatsPerMinute === 'number' ? (rec as any).beatsPerMinute : NaN;
      if (!Number.isFinite(bpm) || bpm < 35 || bpm > 120) continue;
      out.push({ value: bpm, startDate: t });
    }
  }
  return out;
}

/** Per-day resting proxy from overnight HeartRate samples. */
export async function healthConnectFetchRestingHrDailyRows(
  lookbackDays = 14,
): Promise<RestingHrTrendDailyRow[]> {
  if (Platform.OS !== 'android') return [];
  try {
    const hasPerms = await healthConnectHasPermissions(['heart_rate']);
    if (!hasPerms) return [];
    const ready = await initialize().catch(() => false);
    if (!ready) return [];

    const end = new Date();
    const start = new Date(end.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
    const res = await readRecords('HeartRate', {
      timeRangeFilter: {
        operator: 'between',
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      },
      ascendingOrder: false,
    }).catch(() => ({ records: [] as unknown[] }));

    const overnight = overnightSamplesAsRestingProxy((res as { records?: unknown[] }).records ?? []);
    return bucketRestingHrSamplesToDailyRows(overnight);
  } catch (e) {
    logger.warn('[HealthConnect] resting HR daily proxy failed', e);
    return [];
  }
}
