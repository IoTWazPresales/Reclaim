import { describe, expect, it } from 'vitest';
import { summarizeAccountWindow } from '@/lib/analytics/accountWindow';

describe('summarizeAccountWindow', () => {
  const nowMs = Date.parse('2026-10-07T12:00:00.000Z');

  it('counts finished work inside the window and ignores an open session', () => {
    const summary = summarizeAccountWindow(
      {
        nowMs,
        sessions: [
          { endedAt: '2026-10-06T10:00:00.000Z', totalSets: 12, totalVolume: 1000 },
          { endedAt: null, totalSets: 4, totalVolume: 200 },
          { endedAt: '2026-09-01T10:00:00.000Z', totalSets: 8, totalVolume: 400 },
        ],
        sleep: [{ endTime: '2026-10-07T06:00:00.000Z', durationMinutes: 420 }],
        mood: [{ at: '2026-10-05T08:00:00.000Z' }],
      },
      7,
    );
    expect(summary).toEqual({
      days: 7,
      sessions: 1,
      sets: 12,
      volumeKg: 1000,
      sleepHours: 7,
      moodCheckins: 1,
    });
  });
});
