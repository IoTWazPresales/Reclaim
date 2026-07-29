import { describe, it, expect } from 'vitest';
import { buildHistoricalLedgerByDay } from '@/lib/localData/signalLedgerBackfillCore';
import {
  alignSeriesToDays,
  buildConvergenceAnalysis,
  buildSegmentedPath,
  chartPointPx,
  collectChartDays,
  collectContinuousChartDays,
  moodLinkerDays,
} from '@/components/dashboard/signalChartAnalysis';

describe('buildHistoricalLedgerByDay', () => {
  it('writes sessionsThatDay and rolling weeklySessionCount honestly', () => {
    const byDay = buildHistoricalLedgerByDay({
      moods: [{ logged_at: '2026-07-10T08:00:00.000Z', score: 4 }],
      sleeps: [{ end_time: '2026-07-10T06:00:00.000Z', duration_minutes: 420 }],
      trainings: [
        {
          ended_at: '2026-07-10T18:00:00.000Z',
          summary: { activeCaloriesKcal: 220 },
        },
        {
          ended_at: '2026-07-12T18:00:00.000Z',
          summary: { activeCaloriesKcal: 180 },
        },
      ],
    });

    const d10 = [...byDay.keys()].find((k) => k.includes('07-10') || k.endsWith('-10'));
    // Local timezone may shift ISO — find by factor presence
    let dayWithTrain: string | null = null;
    for (const [day, rows] of byDay) {
      if (rows.some((r) => r.factor === 'training.sessionsThatDay')) {
        dayWithTrain = day;
        break;
      }
    }
    expect(dayWithTrain).toBeTruthy();
    const rows10 = byDay.get(dayWithTrain!)!;
    expect(rows10.some((r) => r.factor === 'training.sessionsThatDay' && r.value === 1)).toBe(true);
    expect(rows10.some((r) => r.factor === 'training.weeklySessionCount')).toBe(true);
    expect(rows10.some((r) => r.factor === 'mood.last' && r.value === 4) || d10).toBeTruthy();
    expect(
      [...byDay.values()].flat().some((r) => r.factor === 'sleep.lastNight.hours' && r.value === 7),
    ).toBe(true);
  });

  it('writes med adherence when meds + logs provided', () => {
    const byDay = buildHistoricalLedgerByDay({
      moods: [],
      sleeps: [],
      trainings: [],
      meds: [
        {
          id: 'm1',
          schedule: { times: ['08:00'], days: [1, 2, 3, 4, 5, 6, 7] },
        },
      ],
      medLogs: [
        {
          med_id: 'm1',
          status: 'taken',
          taken_at: '2026-07-15T08:05:00.000Z',
        },
      ],
    });
    const rows = [...byDay.values()].flat();
    expect(rows.some((r) => r.factor === 'meds.adherencePct7d')).toBe(true);
  });
});

describe('signalChartAnalysis', () => {
  it('aligns series and builds segmented paths without inventing gaps', () => {
    const days = collectChartDays(
      {
        'mood.last': [
          { dayDate: '2026-07-01', factor: 'mood.last', value: 3, source: null, updatedAt: '' },
          { dayDate: '2026-07-03', factor: 'mood.last', value: 4, source: null, updatedAt: '' },
        ],
      },
      ['mood.last'],
    );
    expect(days).toEqual(['2026-07-01', '2026-07-03']);
    const aligned = alignSeriesToDays(
      [
        { dayDate: '2026-07-01', factor: 'mood.last', value: 3, source: null, updatedAt: '' },
        { dayDate: '2026-07-03', factor: 'mood.last', value: 4, source: null, updatedAt: '' },
      ],
      ['2026-07-01', '2026-07-02', '2026-07-03'],
      5,
    );
    expect(aligned[1]!.y).toBeNull();
    const segs = buildSegmentedPath(aligned, 100, 50);
    expect(segs.length).toBeGreaterThanOrEqual(2);
  });

  it('builds continuous 28-day calendar windows ending on a fixed day', () => {
    const days = collectContinuousChartDays(28, new Date(2026, 6, 21));
    expect(days).toHaveLength(28);
    expect(days[0]).toBe('2026-06-24');
    expect(days[days.length - 1]).toBe('2026-07-21');
  });

  it('pads paths so y=0/1 stay inside the plot', () => {
    const aligned = alignSeriesToDays(
      [
        { dayDate: '2026-07-01', factor: 'mood.last', value: 5, source: null, updatedAt: '' },
        { dayDate: '2026-07-02', factor: 'mood.last', value: 0, source: null, updatedAt: '' },
      ],
      ['2026-07-01', '2026-07-02'],
      5,
    );
    const pad = { padX: 8, padY: 10 };
    const segs = buildSegmentedPath(aligned, 100, 50, pad);
    expect(segs[0]).toMatch(/M 8 /);
    expect(segs[0]).toContain(' L 92 ');
    const top = chartPointPx(aligned[0]!, 100, 50, pad)!;
    const bottom = chartPointPx(aligned[1]!, 100, 50, pad)!;
    expect(top.y).toBe(10);
    expect(bottom.y).toBe(40);
  });

  it('marks mood linker days when sleep or training co-occur', () => {
    const days = ['2026-07-01', '2026-07-02', '2026-07-03'];
    const linked = moodLinkerDays(
      {
        'mood.last': [
          { dayDate: '2026-07-01', factor: 'mood.last', value: 3, source: null, updatedAt: '' },
          { dayDate: '2026-07-02', factor: 'mood.last', value: 4, source: null, updatedAt: '' },
        ],
        'sleep.lastNight.hours': [
          { dayDate: '2026-07-01', factor: 'sleep.lastNight.hours', value: 7, source: null, updatedAt: '' },
        ],
        'training.sessionsThatDay': [
          { dayDate: '2026-07-03', factor: 'training.sessionsThatDay', value: 1, source: null, updatedAt: '' },
        ],
      },
      days,
    );
    expect(linked).toEqual(['2026-07-01']);
  });

  it('returns thin-history analysis when overlap is low', () => {
    const text = buildConvergenceAnalysis(
      {
        'mood.last': [
          { dayDate: '2026-07-01', factor: 'mood.last', value: 3, source: null, updatedAt: '' },
        ],
        'sleep.lastNight.hours': [
          { dayDate: '2026-07-02', factor: 'sleep.lastNight.hours', value: 7, source: null, updatedAt: '' },
        ],
      },
      ['2026-07-01', '2026-07-02'],
    );
    expect(text.toLowerCase()).toMatch(/overlap|logging|convergence|signals/);
  });
});
