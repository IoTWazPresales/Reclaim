import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  return {
    default: {
      getItem: vi.fn(async (key: string) => store[key] ?? null),
      setItem: vi.fn(async (key: string, val: string) => {
        store[key] = val;
      }),
      removeItem: vi.fn(async (key: string) => {
        delete store[key];
      }),
      clear: vi.fn(async () => {
        store = {};
      }),
    },
  };
});

import { traceGuidedTransition } from '@/lib/training/guidedTransitionTrace';
import {
  getGuidedTraceEvents,
  __resetGuidedTraceCaptureForTests,
} from '@/lib/training/guidedTraceCapture';

describe('guidedTransitionTrace', () => {
  beforeEach(async () => {
    __resetGuidedTraceCaptureForTests();
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.clear();
  });

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

  it('records one structured row in the dev capture buffer', () => {
    traceGuidedTransition({
      source: 'ui',
      action: 'SET_DONE',
      sessionId: 'sess',
      sessionItemId: 'item',
      exerciseId: 'ex',
      setIndex: 1,
    });
    expect(getGuidedTraceEvents().length).toBe(1);
    expect(getGuidedTraceEvents()[0]?.sessionId).toBe('sess');
  });
});
