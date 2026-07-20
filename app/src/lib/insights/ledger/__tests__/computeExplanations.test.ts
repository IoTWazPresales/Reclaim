import { describe, expect, it } from 'vitest';
import {
  EXPLANATION_MIN_PAIRED_POINTS,
  attachLedgerWhyToMatches,
  computeExplanations,
} from '@/lib/insights/ledger/computeExplanations';
import type { SignalLedgerPoint } from '@/lib/localData/signalLedgerRepository';

function pts(factor: string, values: Array<[string, number]>): SignalLedgerPoint[] {
  return values.map(([dayDate, value]) => ({
    dayDate,
    factor,
    value,
    source: 'test',
    updatedAt: '2026-07-20T00:00:00.000Z',
  }));
}

describe('computeExplanations', () => {
  it('returns empty under sufficiency gate', () => {
    const series = {
      'sleep.lastNight.hours': pts('sleep.lastNight.hours', [
        ['2026-07-01', 6],
        ['2026-07-02', 7],
      ]),
      'mood.last': pts('mood.last', [
        ['2026-07-01', 5],
        ['2026-07-02', 6],
      ]),
    };
    expect(computeExplanations(series)).toEqual([]);
  });

  it('returns observational why when enough paired points and correlation', () => {
    const sleep: Array<[string, number]> = [];
    const mood: Array<[string, number]> = [];
    for (let i = 1; i <= 10; i++) {
      const d = `2026-07-${String(i).padStart(2, '0')}`;
      sleep.push([d, 5 + i * 0.2]);
      mood.push([d, 4 + i * 0.3]);
    }
    const series = {
      'sleep.lastNight.hours': pts('sleep.lastNight.hours', sleep),
      'mood.last': pts('mood.last', mood),
    };
    const ex = computeExplanations(series);
    expect(ex.length).toBeGreaterThan(0);
    expect(ex[0].why.toLowerCase()).toContain('your data');
    expect(ex[0].why.toLowerCase()).not.toContain('caused');
  });

  it('attachLedgerWhyToMatches fills empty why', () => {
    const matches = [{ id: 'a', message: 'Sleep was short', why: undefined as string | undefined }];
    const out = attachLedgerWhyToMatches(matches, [
      {
        factorA: 'sleep.lastNight.hours',
        factorB: 'mood.last',
        lagDays: 0,
        correlation: 0.6,
        why: 'In your data, sleep hours moves with mood (same day). This is an observational pattern in your logs — not medical advice.',
      },
    ]);
    expect(out[0].why).toBeTruthy();
  });

  it('exports min paired constant', () => {
    expect(EXPLANATION_MIN_PAIRED_POINTS).toBe(7);
  });
});
