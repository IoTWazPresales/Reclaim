import { describe, expect, it } from 'vitest';
import type { InsightContext } from '@/lib/insights/InsightEngine';
import { flattenInsightContextToLedgerRows } from '@/lib/localData/signalLedgerFlatten';

describe('flattenInsightContextToLedgerRows', () => {
  it('extracts finite numeric factors and skips missing', () => {
    const ctx: InsightContext = {
      tags: [],
      mood: { last: 6, trend3dPct: -10 },
      sleep: { lastNight: { hours: 6.5 }, debtHours: 3 },
      steps: { lastDay: 4200 },
      training: { weeklySessionCount: 2, completedToday: true },
    };
    const rows = flattenInsightContextToLedgerRows(ctx);
    const byFactor = Object.fromEntries(rows.map((r) => [r.factor, r.value]));
    expect(byFactor['mood.last']).toBe(6);
    expect(byFactor['sleep.lastNight.hours']).toBe(6.5);
    expect(byFactor['steps.lastDay']).toBe(4200);
    expect(byFactor['training.weeklySessionCount']).toBe(2);
    expect(rows.every((r) => Number.isFinite(r.value))).toBe(true);
  });

  it('returns empty for empty-ish context', () => {
    expect(flattenInsightContextToLedgerRows({ tags: [] })).toEqual([]);
  });
});
