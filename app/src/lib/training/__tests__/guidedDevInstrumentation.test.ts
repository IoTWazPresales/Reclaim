import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('guidedDevInstrumentation', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('isGuidedTraceQaBuild is true when EXPO_PUBLIC_GUIDED_TRACE_QA=1', async () => {
    vi.stubEnv('EXPO_PUBLIC_GUIDED_TRACE_QA', '1');
    const { isGuidedTraceQaBuild } = await import('@/lib/training/guidedDevInstrumentation');
    expect(isGuidedTraceQaBuild()).toBe(true);
  });

  it('isGuidedTraceQaBuild is false when flag unset', async () => {
    vi.stubEnv('EXPO_PUBLIC_GUIDED_TRACE_QA', '');
    const { isGuidedTraceQaBuild } = await import('@/lib/training/guidedDevInstrumentation');
    expect(isGuidedTraceQaBuild()).toBe(false);
  });
});
