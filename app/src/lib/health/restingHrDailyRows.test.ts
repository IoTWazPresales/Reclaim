import { describe, expect, it } from 'vitest';

import { bucketRestingHrSamplesToDailyRows } from './restingHrDailyRows';

describe('bucketRestingHrSamplesToDailyRows', () => {
  it('returns empty for empty input', () => {
    expect(bucketRestingHrSamplesToDailyRows([])).toEqual([]);
  });

  it('groups multiple samples on the same local day and averages', () => {
    const rows = bucketRestingHrSamplesToDailyRows([
      { value: 60, startDate: '2026-01-10T08:00:00.000Z' },
      { value: 64, startDate: '2026-01-10T20:00:00.000Z' },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.restingHeartRateBpm).toBe(62);
  });

  it('sorts days ascending', () => {
    const rows = bucketRestingHrSamplesToDailyRows([
      { value: 70, startDate: '2026-01-12T12:00:00.000Z' },
      { value: 60, startDate: '2026-01-10T12:00:00.000Z' },
    ]);
    expect(rows.map((r) => r.restingHeartRateBpm)).toEqual([60, 70]);
  });
});
