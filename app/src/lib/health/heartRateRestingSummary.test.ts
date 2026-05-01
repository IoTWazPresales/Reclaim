import { describe, expect, it } from 'vitest';

import { summarizeRestingHeartRateTrend, type RestingHrTrendDailyRow } from './heartRateRestingSummary';

function day(offsetFromEpoch: number): Date {
  const d = new Date(Date.UTC(2026, 0, 1 + offsetFromEpoch));
  return d;
}

function row(offset: number, bpm: number): RestingHrTrendDailyRow {
  return { date: day(offset), restingHeartRateBpm: bpm };
}

describe('summarizeRestingHeartRateTrend', () => {
  it('returns none when no resting values', () => {
    const s = summarizeRestingHeartRateTrend([
      { date: day(0), restingHeartRateBpm: null },
      { date: day(1), restingHeartRateBpm: null },
    ]);
    expect(s.sufficiency).toBe('none');
    expect(s.trendLabel).toBe('insufficient_data');
    expect(s.recentMedianBpm).toBeNull();
  });

  it('returns sparse when not enough days for baseline comparison', () => {
    const s = summarizeRestingHeartRateTrend([row(0, 60), row(1, 62), row(2, 61)]);
    expect(s.sufficiency).toBe('sparse');
    expect(s.trendLabel).toBe('insufficient_data');
    expect(s.recentMedianBpm).not.toBeNull();
  });

  it('labels above_baseline when recent median is materially higher', () => {
    const rows: RestingHrTrendDailyRow[] = [
      row(0, 60),
      row(1, 60),
      row(2, 60),
      row(3, 60),
      row(4, 70),
      row(5, 70),
      row(6, 70),
    ];
    const s = summarizeRestingHeartRateTrend(rows, {
      recentObservationDays: 3,
      baselineObservationDays: 4,
    });
    expect(s.sufficiency).toBe('adequate');
    expect(s.baselineMedianBpm).toBe(60);
    expect(s.recentMedianBpm).toBe(70);
    expect(s.pctAboveBaseline).toBeCloseTo(1 / 6, 2);
    expect(s.trendLabel).toBe('above_baseline');
  });

  it('labels below_baseline when recent median is materially lower', () => {
    const rows: RestingHrTrendDailyRow[] = [
      row(0, 70),
      row(1, 70),
      row(2, 70),
      row(3, 70),
      row(4, 60),
      row(5, 60),
      row(6, 60),
    ];
    const s = summarizeRestingHeartRateTrend(rows);
    expect(s.trendLabel).toBe('below_baseline');
    expect(s.pctAboveBaseline).toBeLessThan(-0.08);
  });

  it('labels stable when change is under significance threshold', () => {
    const rows: RestingHrTrendDailyRow[] = [
      row(0, 60),
      row(1, 60),
      row(2, 60),
      row(3, 60),
      row(4, 63),
      row(5, 63),
      row(6, 63),
    ];
    const s = summarizeRestingHeartRateTrend(rows);
    expect(s.trendLabel).toBe('stable');
  });

  it('sorts unsorted input by date', () => {
    const rows: RestingHrTrendDailyRow[] = [
      row(6, 70),
      row(0, 60),
      row(3, 60),
      row(4, 70),
      row(1, 60),
      row(2, 60),
      row(5, 70),
    ];
    const s = summarizeRestingHeartRateTrend(rows);
    expect(s.sufficiency).toBe('adequate');
    expect(s.trendLabel).toBe('above_baseline');
  });
});
