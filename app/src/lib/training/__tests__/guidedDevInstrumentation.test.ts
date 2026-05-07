import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('guidedDevInstrumentation', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('isGuidedTraceQaBuild is true when EXPO_PUBLIC_GUIDED_TRACE_QA=1', async () => {
    vi.stubEnv('EXPO_PUBLIC_GUIDED_TRACE_QA', '1');
    const m = await import('@/lib/training/guidedDevInstrumentation');
    expect(m.isGuidedTraceQaBuild()).toBe(true);
    expect(m.isGuidedDevInstrumentationEnabled()).toBe(true);
  });

  it('isGuidedTraceQaBuild is false when unset', async () => {
    const m = await import('@/lib/training/guidedDevInstrumentation');
    expect(m.isGuidedTraceQaBuild()).toBe(false);
  });
});
