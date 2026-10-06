import { describe, expect, it } from 'vitest';
import { closedAfterLongPause, sessionVisibleInHistory } from '@/lib/training/historySessionVisibility';

describe('sessionVisibleInHistory', () => {
  it('keeps a finished run with no sets and a multi-day clock', () => {
    expect(
      sessionVisibleInHistory({
        started_at: '2026-10-05T19:34:26.000Z',
        ended_at: '2026-10-06T07:15:55.000Z',
        decision_trace: { run: true },
        summary: { exercisesCompleted: 0, totalSets: 0 },
      }),
    ).toBe(true);
  });

  it('keeps a finished strength session whose wall clock is longer than 8 hours', () => {
    expect(
      sessionVisibleInHistory({
        started_at: '2026-10-01T16:25:26.000Z',
        ended_at: '2026-10-05T19:24:38.000Z',
        summary: { exercisesCompleted: 8, totalSets: 20 },
      }),
    ).toBe(true);
  });

  it('drops an ended lifting session that logged nothing', () => {
    expect(
      sessionVisibleInHistory({
        started_at: '2026-10-05T10:00:00.000Z',
        ended_at: '2026-10-05T10:20:00.000Z',
        summary: { exercisesCompleted: 0, totalSets: 0 },
      }),
    ).toBe(false);
  });

  it('marks a close the next day as a long pause', () => {
    expect(closedAfterLongPause('2026-10-05T19:34:26.000Z', '2026-10-06T07:15:55.000Z')).toBe(true);
    expect(closedAfterLongPause('2026-10-05T10:00:00.000Z', '2026-10-05T11:00:00.000Z')).toBe(false);
  });
});
