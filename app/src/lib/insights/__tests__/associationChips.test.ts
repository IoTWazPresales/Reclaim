import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { CHEMISTRY_GLOSSARY } from '@/lib/chemistryGlossary';
import { associationChipLabels } from '@/lib/insights/associationChips';

const CAUSAL = /\b(causes|caused|causing)\b/i;

describe('associationChipLabels', () => {
  it('names sleep, mood, and a training session as associated', () => {
    expect(
      associationChipLabels({
        sourceTag: 'sleep_serotonin',
        fields: ['mood.last', 'training.completedToday'],
      }),
    ).toEqual([
      'Associated with sleep',
      'Associated with mood',
      'Associated with a training session',
    ]);
  });

  it('does not invent a chip for a medication-only tag', () => {
    expect(associationChipLabels({ sourceTag: 'meds_fallback', fields: ['meds.adherencePct7d'] })).toEqual([]);
  });

  it('never uses causal wording', () => {
    const labels = associationChipLabels({
      sourceTag: 'mood_dopamine',
      fields: ['sleep.lastNight.hours', 'training.weeklySessionCount'],
    });
    expect(labels.join(' ')).not.toMatch(CAUSAL);
    for (const entry of Object.values(CHEMISTRY_GLOSSARY)) {
      expect(entry.description, entry.id).toMatch(/associated with/i);
      expect(entry.description, entry.id).not.toMatch(CAUSAL);
    }
  });

  it('renders association chips on the insight card instead of receptor names', () => {
    const cardPath = join(dirname(fileURLToPath(import.meta.url)), '../../../components/InsightCard.tsx');
    const source = readFileSync(cardPath, 'utf8');
    expect(source).toContain('associationChipLabels');
    expect(source).not.toContain('CHEMISTRY_GLOSSARY');
    expect(source).not.toContain('Dopamine D2');
  });
});
