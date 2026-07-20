import { describe, it, expect } from 'vitest';
import { buildHistoricalLedgerByDay } from '@/lib/localData/signalLedgerBackfillCore';

describe('buildHistoricalLedgerByDay', () => {
  it('maps mood sleep training into daily ledger rows', () => {
    const byDay = buildHistoricalLedgerByDay({
      moods: [{ logged_at: '2026-07-10T08:00:00.000Z', score: 4 }],
      sleeps: [{ end_time: '2026-07-10T06:00:00.000Z', duration_minutes: 420 }],
      trainings: [
        {
          ended_at: '2026-07-10T18:00:00.000Z',
          summary: { activeCaloriesKcal: 220 },
        },
      ],
    });
    const day = [...byDay.keys()][0];
    expect(day).toBeTruthy();
    const rows = byDay.get(day!)!;
    expect(rows.some((r) => r.factor === 'mood.last' && r.value === 4)).toBe(true);
    expect(rows.some((r) => r.factor === 'sleep.lastNight.hours' && r.value === 7)).toBe(true);
    expect(rows.some((r) => r.factor === 'training.weeklySessionCount' && r.value === 1)).toBe(true);
    expect(rows.some((r) => r.factor === 'training.lastSessionActiveKcal' && r.value === 220)).toBe(
      true,
    );
  });
});
