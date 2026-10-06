import { describe, expect, it } from 'vitest';
import { kcalFromActiveEnergyRecord } from '@/lib/health/activeEnergyKcal';

describe('kcalFromActiveEnergyRecord', () => {
  it('prefers kilocalories when both Android energy fields are present', () => {
    expect(
      kcalFromActiveEnergyRecord({
        energy: { inKilocalories: 23.1957, inCalories: 23195.7 },
      }),
    ).toBeCloseTo(23.1957);
  });

  it('converts small calories when kilocalories are absent', () => {
    expect(kcalFromActiveEnergyRecord({ energy: { inCalories: 23195.7 } })).toBeCloseTo(23.1957);
  });

  it('keeps a legacy calories field that is already in kcal', () => {
    expect(kcalFromActiveEnergyRecord({ calories: 180 })).toBe(180);
  });

  it('returns 0 when the record has no energy', () => {
    expect(kcalFromActiveEnergyRecord({})).toBe(0);
  });
});
