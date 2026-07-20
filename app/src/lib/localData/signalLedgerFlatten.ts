/**
 * Pure flatten: InsightContext → tall ledger rows (no SQLite / Expo imports).
 */
import type { InsightContext, InsightFieldPath } from '@/lib/insights/InsightEngine';

export type SignalLedgerRow = {
  factor: InsightFieldPath | string;
  value: number;
  source: string;
};

function getByPath(ctx: InsightContext, path: string): unknown {
  const parts = path.split('.');
  let cur: any = ctx;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[p];
  }
  return cur;
}

/** Controlled vocab — numeric scalars only (no tags / booleans / labels). */
export const SIGNAL_LEDGER_FACTORS: ReadonlyArray<{
  factor: InsightFieldPath;
  source: string;
}> = [
  { factor: 'mood.last', source: 'mood' },
  { factor: 'mood.deltaVsBaseline', source: 'mood' },
  { factor: 'mood.trend3dPct', source: 'mood' },
  { factor: 'sleep.lastNight.hours', source: 'sleep' },
  { factor: 'sleep.lastNight.quality', source: 'sleep' },
  { factor: 'sleep.lastNight.efficiency', source: 'sleep' },
  { factor: 'sleep.avg7d.hours', source: 'sleep' },
  { factor: 'sleep.debtHours', source: 'sleep' },
  { factor: 'steps.lastDay', source: 'activity' },
  { factor: 'meds.adherencePct7d', source: 'meds' },
  { factor: 'training.daysSinceLastSession', source: 'training' },
  { factor: 'training.weeklySessionCount', source: 'training' },
  { factor: 'training.lastSessionActiveKcal', source: 'training' },
  { factor: 'training.weeklyActiveKcalSum', source: 'training' },
  { factor: 'baseline.moodAvg', source: 'baseline' },
  { factor: 'baseline.sleepAvgHours', source: 'baseline' },
  { factor: 'baseline.stepsAvg', source: 'baseline' },
];

export function flattenInsightContextToLedgerRows(context: InsightContext): SignalLedgerRow[] {
  const out: SignalLedgerRow[] = [];
  for (const { factor, source } of SIGNAL_LEDGER_FACTORS) {
    const raw = getByPath(context, factor);
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      out.push({ factor, value: raw, source });
    }
  }
  return out;
}
