import { describe, expect, it } from 'vitest';
import { applyOptionalAdaptiveLoadBias } from '@/lib/training/adaptiveLoadBias';
import type { Exercise, UserState } from '@/lib/training/types';

const exercise = {
  id: 'squat',
  name: 'Squat',
  aliases: [],
  intents: ['knee_dominant'],
  equipment: ['barbell'],
  musclesPrimary: ['quads'],
  musclesSecondary: [],
  difficulty: 'intermediate',
  contraindications: [],
  substitutionTags: [],
  unilateral: false,
} as Exercise;

const baseState: UserState = { experienceLevel: 'intermediate' };

describe('applyOptionalAdaptiveLoadBias', () => {
  it('is identity when disabled', () => {
    expect(
      applyOptionalAdaptiveLoadBias(100, exercise, { ...baseState, fatigueProxy: 0.9 }, false).weight,
    ).toBe(100);
  });

  it('eases load when enabled and fatigue elevated', () => {
    const { weight, reason } = applyOptionalAdaptiveLoadBias(
      100,
      exercise,
      { ...baseState, fatigueProxy: 0.8 },
      true,
    );
    expect(weight).toBeLessThan(100);
    expect(reason).toMatch(/Adaptive/i);
  });
});
