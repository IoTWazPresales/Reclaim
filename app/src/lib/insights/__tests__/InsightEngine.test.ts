import { describe, expect, it } from 'vitest';

import {
  createInsightEngine,
  evaluateInsight,
  type InsightContext,
  type InsightRule,
} from '@/lib/insights/InsightEngine';

const sampleRules: InsightRule[] = [
  {
    id: 'low-mood-sleep-debt',
    priority: 5,
    condition: [
      { field: 'mood.last', operator: 'lt', value: 3 },
      { field: 'sleep.lastNight.hours', operator: 'lt', value: 6 },
    ],
    message: 'Low sleep can dampen mood-regulating serotonin.',
    action: 'Take a 10 minute sunlight walk.',
    sourceTag: 'sleep',
  },
  {
    id: 'dopamine-dip',
    priority: 4,
    condition: [{ field: 'mood.trend3dPct', operator: 'pctLt', value: -10 }],
    message: 'Mood dip can follow sustained stress.',
    action: 'Do a two-minute quick win.',
    sourceTag: 'mood',
  },
  {
    id: 'circadian-shift',
    priority: 3,
    condition: [{ field: 'sleep.midpoint.deltaMin', operator: 'gt', value: 90 }],
    message: 'Body clock may be drifting later.',
    action: 'Morning light and limit caffeine after 2pm.',
    sourceTag: 'sleep',
  },
  {
    id: 'inactivity',
    priority: 4,
    condition: [
      { field: 'steps.lastDay', operator: 'lt', value: 2000 },
      { field: 'mood.last', operator: 'lt', value: 4 },
    ],
    message: 'Gentle movement can lift energy.',
    action: 'Take a 5 minute brisk walk.',
    sourceTag: 'activity',
  },
  {
    id: 'meds-adherence',
    priority: 2,
    condition: [{ field: 'meds.adherencePct7d', operator: 'lt', value: 70 }],
    message: 'Medication adherence slipped.',
    action: 'Tie your next dose to a daily habit.',
    sourceTag: 'meds',
  },
  {
    id: 'vagal-tone',
    priority: 4,
    condition: [
      { field: 'stress.flag', operator: 'eq', value: 1 },
      { field: 'sleep.lastNight.hours', operator: 'lt', value: 6 },
    ],
    message: 'Short sleep can amplify stress physiology.',
    action: 'Try three rounds of 4-7-8 breathing.',
    sourceTag: 'breath',
  },
];

describe('evaluateInsight', () => {
  it('returns highest priority insight when multiple match', () => {
    const context: InsightContext = {
      mood: { last: 2.5, trend3dPct: -12 },
      sleep: { lastNight: { hours: 5.5 } },
      steps: { lastDay: 1800 },
    };

    const result = evaluateInsight(context, sampleRules);

    expect(result?.id).toBe('low-mood-sleep-debt');
  });

  it('uses specificity tie-breaker when priority matches', () => {
    const context: InsightContext = {
      mood: { last: 2.9, trend3dPct: -12 },
      sleep: { lastNight: { hours: 7 } },
    };

    const result = evaluateInsight(context, sampleRules);

    expect(result?.id).toBe('dopamine-dip');
  });

  it('returns null when no condition matches', () => {
    const context: InsightContext = {
      mood: { last: 7 },
      sleep: { lastNight: { hours: 8 } },
      steps: { lastDay: 6000 },
      meds: { adherencePct7d: 95 },
    };

    const result = evaluateInsight(context, sampleRules);

    expect(result).toBeNull();
  });

  it('supports percentage operators', () => {
    const context: InsightContext = {
      mood: { last: 4, trend3dPct: -15 },
    };

    const result = evaluateInsight(context, sampleRules);

    expect(result?.id).toBe('dopamine-dip');
  });

  it('supports gt operator with midpoint delta', () => {
    const context: InsightContext = {
      sleep: { midpoint: { deltaMin: 120 } },
    };

    const result = evaluateInsight(context, sampleRules);

    expect(result?.id).toBe('circadian-shift');
  });

  it('caches evaluation in InsightEngine', () => {
    const engine = createInsightEngine(sampleRules);
    const context: InsightContext = {
      mood: { last: 2, trend3dPct: -11 },
      sleep: { lastNight: { hours: 5.5 } },
    };

    const first = engine.evaluate(context);
    const second = engine.evaluate({ ...context });

    expect(first).toStrictEqual(second);
  });

  it('considers stress flag boolean matches', () => {
    const context: InsightContext = {
      mood: { last: 4.2 },
      sleep: { lastNight: { hours: 5.2 } },
      flags: { stress: true },
    };

    const result = evaluateInsight(context, sampleRules);

    expect(result?.id).toBe('vagal-tone');
  });
});

