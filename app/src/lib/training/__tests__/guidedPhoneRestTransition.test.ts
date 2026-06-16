import { describe, it, expect } from 'vitest';
import { resolveRestPeriodAfterCompletingSet } from '../guidedPhoneRestTransition';

describe('resolveRestPeriodAfterCompletingSet', () => {
  it('returns null when no planned sets', () => {
    expect(resolveRestPeriodAfterCompletingSet([], 1, undefined)).toBeNull();
  });

  it('returns null when completed set has no rest', () => {
    const sets = [
      { setIndex: 1, restSeconds: 0 },
      { setIndex: 2, restSeconds: 90 },
    ];
    expect(resolveRestPeriodAfterCompletingSet(sets, 1, undefined)).toBeNull();
  });

  it('returns rest seconds after completing set N when set N has restSeconds > 0', () => {
    const sets = [
      { setIndex: 1, restSeconds: 90 },
      { setIndex: 2, restSeconds: 90 },
    ];
    const r = resolveRestPeriodAfterCompletingSet(sets, 1, undefined);
    expect(r).not.toBeNull();
    expect(r!.restSeconds).toBe(90);
    expect(r!.adjustment).toBe('normal');
  });

  it('returns null after final set when that set has no rest', () => {
    const sets = [{ setIndex: 1, restSeconds: 90 }];
    expect(resolveRestPeriodAfterCompletingSet(sets, 1, undefined)?.restSeconds).toBe(90);
    // completing "set 2" doesn't exist
    expect(resolveRestPeriodAfterCompletingSet(sets, 2, undefined)).toBeNull();
  });

  it('applies RPE-based rest adjustment when rpe provided', () => {
    const sets = [{ setIndex: 1, restSeconds: 60 }];
    const r = resolveRestPeriodAfterCompletingSet(sets, 1, 10);
    expect(r).not.toBeNull();
    expect(r!.restSeconds).toBeGreaterThan(60);
    expect(r!.adjustment).toBe('extended');
  });
});
