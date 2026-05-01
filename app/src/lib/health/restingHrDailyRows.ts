import type { RestingHrTrendDailyRow } from '@/lib/health/heartRateRestingSummary';

function dayKeyLocal(d: Date): string {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dateFromLocalDayKey(key: string): Date {
  const [y, mo, da] = key.split('-').map((n) => parseInt(n, 10));
  return new Date(y, (mo ?? 1) - 1, da ?? 1);
}

/** Buckets resting-HR samples into one mean BPM per local calendar day (HealthKit / HC agnostic). */
export function bucketRestingHrSamplesToDailyRows(
  samples: Array<{ value?: number; startDate?: string; date?: string }>,
): RestingHrTrendDailyRow[] {
  const byDay = new Map<string, number[]>();
  for (const r of samples) {
    const raw = r.startDate ?? r.date;
    if (!raw) continue;
    const t = new Date(raw);
    if (Number.isNaN(t.getTime())) continue;
    const v = typeof r.value === 'number' ? r.value : NaN;
    if (!Number.isFinite(v)) continue;
    const key = dayKeyLocal(t);
    const list = byDay.get(key) ?? [];
    list.push(v);
    byDay.set(key, list);
  }
  return Array.from(byDay.entries())
    .map(([key, vals]) => {
      const sum = vals.reduce((a, b) => a + b, 0);
      const resting = Math.round((sum / vals.length) * 10) / 10;
      return { date: dateFromLocalDayKey(key), restingHeartRateBpm: resting };
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}
