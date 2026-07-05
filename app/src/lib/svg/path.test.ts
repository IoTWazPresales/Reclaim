import { describe, expect, it } from 'vitest';

import { formatSvgNum, hasValidPathCommandArity, isValidPathD } from '@/lib/svg/path';

describe('hasValidPathCommandArity', () => {
  it('accepts a well-formed cubic close path', () => {
    const d = 'M 0 0 C 10 10 20 20 30 30 Z';
    expect(hasValidPathCommandArity(d)).toBe(true);
  });

  it('rejects C with only 4 numbers (ribbonD bug)', () => {
    const d = 'M -4 40 C 28 62 -4 70 Z';
    expect(hasValidPathCommandArity(d)).toBe(false);
    expect(isValidPathD(d)).toBe(false);
  });

  it('accepts fixed ribbonD tail (6 numbers on final C)', () => {
    const d = 'M -4 40 C 28 62 8 70 -4 70 Z';
    expect(hasValidPathCommandArity(d)).toBe(true);
    expect(isValidPathD(d)).toBe(true);
  });

  it('accepts traceD shape (M + two cubics)', () => {
    const centerY = 51;
    const d = `M 6 ${formatSvgNum(centerY)} C 30 ${formatSvgNum(centerY - 3)} 54 ${formatSvgNum(centerY - 5)} 78 ${formatSvgNum(centerY - 4)} C 102 ${formatSvgNum(centerY - 3)} 102 ${formatSvgNum(centerY - 6)} 106 ${formatSvgNum(centerY - 8)}`;
    expect(hasValidPathCommandArity(d)).toBe(true);
  });

  it('accepts hypno join (M + Q)', () => {
    expect(hasValidPathCommandArity('M 12 33 Q 14.5 47 12 61')).toBe(true);
  });

  it('accepts insight ambient wash (M H V H Z)', () => {
    expect(hasValidPathCommandArity('M 0 0 H 320 V 180 H 0 Z')).toBe(true);
  });
});
