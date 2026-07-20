import { describe, expect, it } from 'vitest';
import { EVENING_WIND_DOWN, experimentDayProgress } from '@/lib/experiments/behavioralExperiment';

describe('behavioralExperiment', () => {
  it('exposes evening wind-down metadata', () => {
    expect(EVENING_WIND_DOWN.id).toBe('evening_wind_down');
    expect(EVENING_WIND_DOWN.durationDays).toBe(14);
  });

  it('computes day progress from startedAt', () => {
    const startedAt = new Date('2026-07-01T12:00:00.000Z').toISOString();
    const now = new Date('2026-07-05T12:00:00.000Z');
    const p = experimentDayProgress(
      { experimentId: 'evening_wind_down', startedAt, completions: ['2026-07-02'] },
      now,
    );
    expect(p.dayNumber).toBeGreaterThanOrEqual(4);
    expect(p.completionCount).toBe(1);
  });
});
