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
      { field: 'flags.stress', operator: 'eq', value: true },
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
      tags: [],
    };

    const result = evaluateInsight(context, sampleRules);

    expect(result?.id).toBe('low-mood-sleep-debt');
  });

  it('uses specificity tie-breaker when priority matches', () => {
    const context: InsightContext = {
      mood: { last: 2.9, trend3dPct: -12 },
      sleep: { lastNight: { hours: 7 } },
      tags: [],
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
      tags: [],
    };

    const result = evaluateInsight(context, sampleRules);

    expect(result).toBeNull();
  });

  it('supports percentage operators', () => {
    const context: InsightContext = {
      mood: { last: 4, trend3dPct: -15 },
      tags: [],
    };

    const result = evaluateInsight(context, sampleRules);

    expect(result?.id).toBe('dopamine-dip');
  });

  it('supports gt operator with midpoint delta', () => {
    const context: InsightContext = {
      sleep: { midpoint: { deltaMin: 120 } },
      tags: [],
    };

    const result = evaluateInsight(context, sampleRules);

    expect(result?.id).toBe('circadian-shift');
  });

  it('caches evaluation in InsightEngine', () => {
    const engine = createInsightEngine(sampleRules);
    const context: InsightContext = {
      mood: { last: 2, trend3dPct: -11 },
      sleep: { lastNight: { hours: 5.5 } },
      tags: [],
    };

    const first = engine.evaluateAll(context)[0];
    const second = engine.evaluateAll({ ...context })[0];

    expect(first).toStrictEqual(second);
  });

  it('considers stress flag boolean matches', () => {
    const context: InsightContext = {
      mood: { last: 4.2 },
      sleep: { lastNight: { hours: 5.2 } },
      flags: { stress: true },
      tags: [],
    };

    const result = evaluateInsight(context, sampleRules);

    expect(result?.id).toBe('vagal-tone');
  });

  it('ignores disabled rules even if conditions match', () => {
    const rulesWithDisabled: InsightRule[] = [
      ...sampleRules,
      {
        id: 'disabled-rule',
        priority: 10, // Higher priority than others
        enabled: false,
        condition: [{ field: 'mood.last', operator: 'lt', value: 5 }],
        message: 'This should never appear',
        sourceTag: 'disabled',
      },
    ];

    const context: InsightContext = {
      mood: { last: 2 },
      tags: [],
    };

    const engine = createInsightEngine(rulesWithDisabled);
    const matches = engine.evaluateAll(context);

    // Disabled rule should not appear even though it matches
    expect(matches.find((m) => m.id === 'disabled-rule')).toBeUndefined();
  });

  it('uses tie-breaker: more conditions wins when priorities tie', () => {
    const tieBreakerRules: InsightRule[] = [
      {
        id: 'rule-single-condition',
        priority: 5,
        condition: [{ field: 'mood.last', operator: 'lt', value: 4 }],
        message: 'Single condition rule',
        sourceTag: 'single',
      },
      {
        id: 'rule-double-condition',
        priority: 5, // Same priority
        condition: [
          { field: 'mood.last', operator: 'lt', value: 4 },
          { field: 'sleep.lastNight.hours', operator: 'lt', value: 7 },
        ],
        message: 'Double condition rule',
        sourceTag: 'double',
      },
    ];

    const context: InsightContext = {
      mood: { last: 3 },
      sleep: { lastNight: { hours: 6 } },
      tags: [],
    };

    const engine = createInsightEngine(tieBreakerRules);
    const matches = engine.evaluateAll(context);

    // Both match, but double-condition should win (more specific)
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0]?.id).toBe('rule-double-condition');
  });

  it('uses id as final tie-breaker when priority and condition count tie', () => {
    const tieBreakerRules: InsightRule[] = [
      {
        id: 'rule-zebra',
        priority: 5,
        condition: [
          { field: 'mood.last', operator: 'lt', value: 4 },
          { field: 'sleep.lastNight.hours', operator: 'lt', value: 7 },
        ],
        message: 'Zebra rule',
        sourceTag: 'zebra',
      },
      {
        id: 'rule-alpha',
        priority: 5, // Same priority
        condition: [
          { field: 'mood.last', operator: 'lt', value: 4 },
          { field: 'sleep.lastNight.hours', operator: 'lt', value: 7 },
        ],
        message: 'Alpha rule',
        sourceTag: 'alpha',
      },
    ];

    const context: InsightContext = {
      mood: { last: 3 },
      sleep: { lastNight: { hours: 6 } },
      tags: [],
    };

    const engine = createInsightEngine(tieBreakerRules);
    const matches = engine.evaluateAll(context);

    // Both match with same priority and condition count, 'rule-alpha' should win (alphabetically first)
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0]?.id).toBe('rule-alpha');
  });
});

