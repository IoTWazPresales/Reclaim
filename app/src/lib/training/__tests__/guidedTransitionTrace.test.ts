import { describe, it, expect } from 'vitest';
import { traceGuidedTransition } from '@/lib/training/guidedTransitionTrace';

describe('guidedTransitionTrace', () => {
  it('invokes without throwing (DEV-only logger)', () => {
    expect(() =>
      traceGuidedTransition({
        source: 'ui',
        action: 'SET_DONE',
        sessionId: 'sess',
        sessionItemId: 'item',
        exerciseId: 'ex',
        setIndex: 1,
      }),
    ).not.toThrow();
  });
});
