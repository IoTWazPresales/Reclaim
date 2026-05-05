import { describe, it, expect } from 'vitest';
import { buildMedicationInsightHints } from '../insights/medicationInsightHints';

/** Treatment directives / causal claims must not appear in insight hint copy */
const FORBIDDEN = [
  /should take/i,
  /must take/i,
  /stop taking/i,
  /avoid training/i,
  /caused your/i,
  /do not train/i,
];

describe('medicationInsightHints', () => {
  it('includes cautious PRN wording when an as-needed med was logged today', () => {
    const iso = new Date().toISOString();
    const hints = buildMedicationInsightHints(
      [{ med_id: 'p1', status: 'taken', taken_at: iso }],
      [{ id: 'p1', name: 'Acetaminophen', schedule: { prn: true } }],
    );
    expect(hints.some((h) => /as-needed/i.test(h))).toBe(true);
    expect(hints.some((h) => /context/i.test(h) && /cause/i.test(h))).toBe(true);
  });

  it('does not emit forbidden advisory or causal phrases', () => {
    const iso = new Date().toISOString();
    const hints = buildMedicationInsightHints(
      [{ med_id: 'p1', status: 'taken', taken_at: iso }],
      [{ id: 'p1', name: 'Test PRN', schedule: { prn: true } }],
    );
    const blob = hints.join(' ');
    for (const re of FORBIDDEN) {
      expect(re.test(blob)).toBe(false);
    }
  });

  it('returns empty hints when no qualifying logs', () => {
    const hints = buildMedicationInsightHints([], [{ id: 'p1', name: 'X', schedule: { prn: true } }]);
    expect(hints).toEqual([]);
  });

  it('scheduled dose logged today adds a cautious scheduled-med context line', () => {
    const iso = new Date().toISOString();
    const hints = buildMedicationInsightHints(
      [{ med_id: 's1', status: 'taken', taken_at: iso }],
      [{ id: 's1', name: 'Daily med', schedule: { times: ['08:00'], days: [1, 2, 3, 4, 5, 6, 7] } }],
    );
    expect(hints.some((h) => /scheduled medication doses/i.test(h))).toBe(true);
  });
});
