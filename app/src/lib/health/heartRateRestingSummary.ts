import type { HealthConnectDailyVitals } from './healthConnectService';

export type RestingHrTrendLabel =
  | 'insufficient_data'
  | 'stable'
  | 'above_baseline'
  | 'below_baseline';

export type RestingHrDataSufficiency = 'none' | 'sparse' | 'adequate';

export type RestingHeartRateTrendSummary = {
  sufficiency: RestingHrDataSufficiency;
  recentMedianBpm: number | null;
  baselineMedianBpm: number | null;
  /** Fraction above baseline, e.g. 0.1 = +10%. Null when not computable. */
  pctAboveBaseline: number | null;
  trendLabel: RestingHrTrendLabel;
  /** Short note for audits; not shown to users as medical advice. */
  methodNote: string;
};

function dayStartMs(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function median(values: number[]): number {
  if (values.length === 0) return NaN;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

const DEFAULT_RECENT_OBSERVATION_DAYS = 3;
const DEFAULT_BASELINE_OBSERVATION_DAYS = 4;
/** Require at least this fractional change vs baseline before a directional label. */
const SIGNIFICANT_BAND = 0.08;

/**
 * Compares median resting HR over the most recent observation days vs the prior block.
 * Labels are descriptive only (not diagnostic). Safe to use for copy that avoids clinical claims.
 */
export function summarizeRestingHeartRateTrend(
  rows: HealthConnectDailyVitals[],
  options?: {
    recentObservationDays?: number;
    baselineObservationDays?: number;
  },
): RestingHeartRateTrendSummary {
  const recentN = options?.recentObservationDays ?? DEFAULT_RECENT_OBSERVATION_DAYS;
  const baselineN = options?.baselineObservationDays ?? DEFAULT_BASELINE_OBSERVATION_DAYS;

  const points: { dayMs: number; bpm: number }[] = [];
  for (const row of rows) {
    const v = row.restingHeartRateBpm;
    if (v == null || !Number.isFinite(v)) continue;
    points.push({ dayMs: dayStartMs(row.date), bpm: v });
  }
  points.sort((a, b) => a.dayMs - b.dayMs);

  if (points.length === 0) {
    return {
      sufficiency: 'none',
      recentMedianBpm: null,
      baselineMedianBpm: null,
      pctAboveBaseline: null,
      trendLabel: 'insufficient_data',
      methodNote: 'No resting heart rate samples in range.',
    };
  }

  if (points.length < recentN + 2) {
    const recentSlice = points.slice(-recentN);
    const recentMedianBpm = median(recentSlice.map((p) => p.bpm));
    return {
      sufficiency: 'sparse',
      recentMedianBpm: Number.isFinite(recentMedianBpm) ? Math.round(recentMedianBpm * 10) / 10 : null,
      baselineMedianBpm: null,
      pctAboveBaseline: null,
      trendLabel: 'insufficient_data',
      methodNote: 'Not enough history to compare recent vs prior window.',
    };
  }

  const recentSlice = points.slice(-recentN);
  const baselineSlice = points.slice(-(recentN + baselineN), -recentN);

  if (baselineSlice.length < 2) {
    const recentMedianBpm = median(recentSlice.map((p) => p.bpm));
    return {
      sufficiency: 'sparse',
      recentMedianBpm: Number.isFinite(recentMedianBpm) ? Math.round(recentMedianBpm * 10) / 10 : null,
      baselineMedianBpm: null,
      pctAboveBaseline: null,
      trendLabel: 'insufficient_data',
      methodNote: 'Baseline window needs at least two days with resting HR.',
    };
  }

  const recentMedianBpm = median(recentSlice.map((p) => p.bpm));
  const baselineMedianBpm = median(baselineSlice.map((p) => p.bpm));
  if (!Number.isFinite(recentMedianBpm) || !Number.isFinite(baselineMedianBpm) || baselineMedianBpm === 0) {
    return {
      sufficiency: 'sparse',
      recentMedianBpm: null,
      baselineMedianBpm: null,
      pctAboveBaseline: null,
      trendLabel: 'insufficient_data',
      methodNote: 'Could not compute medians.',
    };
  }

  const pctAboveBaseline = (recentMedianBpm - baselineMedianBpm) / baselineMedianBpm;
  const round = (n: number) => Math.round(n * 10) / 10;

  let trendLabel: RestingHrTrendLabel = 'stable';
  if (pctAboveBaseline >= SIGNIFICANT_BAND) trendLabel = 'above_baseline';
  else if (pctAboveBaseline <= -SIGNIFICANT_BAND) trendLabel = 'below_baseline';

  return {
    sufficiency: 'adequate',
    recentMedianBpm: round(recentMedianBpm),
    baselineMedianBpm: round(baselineMedianBpm),
    pctAboveBaseline: Math.round(pctAboveBaseline * 1000) / 1000,
    trendLabel,
    methodNote: `Median of last ${recentN} days with resting HR vs prior ${baselineN} observation days.`,
  };
}
