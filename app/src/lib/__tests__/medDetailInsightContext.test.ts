import { describe, expect, it } from 'vitest';
import { buildMedDetailInsightSignals } from '@/lib/medDetailInsightContext';
import type { InsightContext } from '@/lib/insights/InsightEngine';
import type { InsightContextSourceData } from '@/lib/insights/contextBuilder';

describe('buildMedDetailInsightSignals', () => {
  it('prefers lastContext aggregates over raw-source fallbacks', () => {
    const lastContext: InsightContext = {
      mood: { last: 4, trend3dPct: 12 },
      sleep: { lastNight: { hours: 7.5 }, avg7d: { hours: 6.8 } },
      tags: ['calm'],
      flags: { stress: false },
    };
    const lastSource: InsightContextSourceData = {
      moods: [{ created_at: '2026-01-01T00:00:00Z', rating: 1 } as any],
      sleepSessions: [],
      activity: [],
      medLogs: [],
      trainingSessions: [],
      insightFeedbackLatestById: {},
    };

    const signals = buildMedDetailInsightSignals(lastContext, lastSource);

    expect(signals.mood?.latest).toBe(4);
    expect(signals.mood?.trend3dPct).toBe(12);
    expect(signals.mood?.tags).toEqual(['calm']);
    expect(signals.sleep?.lastNightHours).toBe(7.5);
    expect(signals.sleep?.avg7dHours).toBe(6.8);
    expect(signals.flags?.stress).toBe(false);
  });

  it('falls back to medDetailSignals when lastContext is missing', () => {
    const lastSource: InsightContextSourceData = {
      moods: [
        { created_at: '2026-06-07T10:00:00Z', rating: 2, tags: ['anxious'] } as any,
      ],
      sleepSessions: [],
      activity: [],
      medLogs: [],
      trainingSessions: [],
      insightFeedbackLatestById: {},
    };

    const signals = buildMedDetailInsightSignals(undefined, lastSource);

    expect(signals.mood?.latest).toBe(2);
    expect(signals.mood?.tags).toContain('anxious');
    expect(signals.flags?.stress).toBe(true);
  });

  it('returns empty-safe signals when insights are not loaded', () => {
    const signals = buildMedDetailInsightSignals(undefined, undefined);

    expect(signals.mood?.latest).toBeUndefined();
    expect(signals.sleep?.lastNightHours).toBeUndefined();
    expect(signals.sleep?.sparseData).toBe(false);
    expect(signals.flags?.stress).toBe(false);
  });
});
