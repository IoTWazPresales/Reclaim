import { describe, expect, it } from 'vitest';
import rawRules from '@/data/insights.json';
import { resolveInsightAction, type InsightActionIntent } from '../insightActions';

const EXECUTABLE: InsightActionIntent[] = [
  'open_training',
  'open_sleep',
  'open_mood_checkin',
  'open_meditation',
  'open_meds_today',
  'open_analytics',
];

describe('resolveInsightAction', () => {
  it.each(EXECUTABLE)('%s resolves to executable kind + non-empty ctaLabel', (intent) => {
    const resolved = resolveInsightAction({ actionIntent: intent });
    expect(resolved.intent).toBe(intent);
    expect(resolved.kind).not.toBe('none');
    expect(resolved.ctaLabel.length).toBeGreaterThan(0);
  });

  it('open_mood_checkin uses log kind', () => {
    expect(resolveInsightAction({ actionIntent: 'open_mood_checkin' }).kind).toBe('log');
  });

  it('missing intent → advice_only without throw', () => {
    expect(resolveInsightAction({})).toEqual({
      intent: 'advice_only',
      kind: 'none',
      ctaLabel: '',
    });
  });

  it('unknown intent → advice_only without throw', () => {
    expect(resolveInsightAction({ actionIntent: 'not_a_real_intent' })).toEqual({
      intent: 'advice_only',
      kind: 'none',
      ctaLabel: '',
    });
  });

  it('explicit advice_only → none', () => {
    expect(resolveInsightAction({ actionIntent: 'advice_only' }).kind).toBe('none');
  });

  it('every insights.json actionIntent (when present) resolves to a non-advice_only action', () => {
    const rules = rawRules as Array<{ id: string; actionIntent?: string }>;
    const tagged = rules.filter((r) => typeof r.actionIntent === 'string' && r.actionIntent.trim());
    expect(tagged.length).toBeGreaterThan(0);
    for (const rule of tagged) {
      const resolved = resolveInsightAction({ actionIntent: rule.actionIntent });
      expect(resolved.intent, rule.id).not.toBe('advice_only');
      expect(resolved.kind, rule.id).not.toBe('none');
      expect(resolved.ctaLabel.length, rule.id).toBeGreaterThan(0);
    }
  });
});
