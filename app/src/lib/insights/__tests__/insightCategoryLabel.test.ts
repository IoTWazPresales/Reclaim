import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import rawRules from '@/data/insights.json';
import { getTagForInsight } from '@/lib/chemistryGlossary';
import { formatInsightCategory } from '../insightCategoryLabel';

const ALLOWED = new Set([
  'Sleep',
  'Sleep timing',
  'Breathing',
  'Mood',
  'Medication',
  'Training',
  'Movement',
  'Stress',
  'Social',
  'Today',
  'Patterns',
  'Recovery',
  'Activity',
  'Daily signal',
]);

const MECHANISM =
  /serotonin|dopamine|vagal|endorphin|allostatic|circadian|depletion|inertia|cortisol|melatonin|bdnf|hrv|gaba|\brem\b|\bhr\b/i;

type InsightRule = { id?: string; sourceTag?: string };

describe('formatInsightCategory', () => {
  it('replaces mechanism tags with neutral domain labels', () => {
    expect(formatInsightCategory('sleep_serotonin')).toBe('Sleep');
    expect(formatInsightCategory('sleep_breath_vagal')).toBe('Breathing');
    expect(formatInsightCategory('mood_dopamine')).toBe('Mood');
    expect(formatInsightCategory('sleep_serotonin')).not.toMatch(MECHANISM);
    expect(formatInsightCategory('sleep_breath_vagal')).not.toMatch(MECHANISM);
    expect(formatInsightCategory('mood_dopamine')).not.toMatch(MECHANISM);
  });

  it('does not title-case unknown internal tags', () => {
    expect(formatInsightCategory('unknown_mechanism_tag')).toBe('Daily signal');
    expect(formatInsightCategory('xyz_dopamine')).toBe('Daily signal');
    expect(formatInsightCategory('not_a_catalog_tag')).not.toMatch(/not a catalog tag/i);
    expect(formatInsightCategory(null)).toBe('Daily signal');
    expect(formatInsightCategory('   ')).toBe('Daily signal');
  });

  it('keeps bare domain tags already used outside the catalogue', () => {
    expect(formatInsightCategory('sleep')).toBe('Sleep');
    expect(formatInsightCategory('mood')).toBe('Mood');
    expect(formatInsightCategory('breath')).toBe('Breathing');
  });

  it('gives every catalogued sourceTag an allowed label and leaves the tag stored', () => {
    const rules = rawRules as InsightRule[];
    expect(rules.length).toBe(89);
    for (const rule of rules) {
      const tag = rule.sourceTag ?? '';
      const label = formatInsightCategory(tag);
      expect(ALLOWED.has(label), `${rule.id} ${tag} -> ${label}`).toBe(true);
      expect(label, rule.id).not.toBe('Daily signal');
      expect(label, rule.id).not.toMatch(MECHANISM);
      expect(rule.sourceTag).toBe(tag);
    }
  });

  it('leaves chemistry chip identity for N-0035', () => {
    expect(getTagForInsight('sleep_serotonin')).toEqual([
      'serotonin_5ht1a',
      'melatonin',
      'cortisol',
    ]);
  });

  it('renders the formatter from InsightCard without rewriting telemetry source_tag', () => {
    const cardPath = join(dirname(fileURLToPath(import.meta.url)), '../../../components/InsightCard.tsx');
    const source = readFileSync(cardPath, 'utf8');
    expect(source).toContain('{formatInsightCategory(insight.sourceTag)}');
    expect(source).toContain('source_tag: insight.sourceTag ?? null');
    expect(source).not.toContain(".replace(/_/g, ' ')");
  });
});
