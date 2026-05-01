import { describe, it, expect } from 'vitest';
import { mapUiConstraintIdsToEngineInjuries } from '../setupMappings';

describe('mapUiConstraintIdsToEngineInjuries', () => {
  it('maps UI chips to catalog injury tokens', () => {
    expect(mapUiConstraintIdsToEngineInjuries(['knee_pain', 'back_sensitive'])).toEqual([
      'knee_injury',
      'lower_back_injury',
    ]);
  });

  it('dedupes and expands shoulder', () => {
    const out = mapUiConstraintIdsToEngineInjuries(['shoulder_issues']);
    expect(out).toContain('shoulder_impingement');
    expect(out).toContain('rotator_cuff_injury');
    expect(out.length).toBe(2);
  });
});
