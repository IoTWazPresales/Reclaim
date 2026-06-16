import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

import {
  GUIDED_TRACE_BUFFER_MAX,
  appendGuidedTraceCapture,
  clearGuidedTraceEvents,
  formatGuidedTracesForExport,
  getGuidedTraceEvents,
  hydrateGuidedTraceCaptureFromStorage,
  __resetGuidedTraceCaptureForTests,
} from '@/lib/training/guidedTraceCapture';
import type { GuidedTracePayload } from '@/lib/training/guidedTransitionTrace';

function row(note: string): GuidedTracePayload {
  return {
    ts: new Date().toISOString(),
    source: 'ui',
    action: 'SET_DONE',
    note,
  };
}

describe('guidedTraceCapture', () => {
  beforeEach(async () => {
    __resetGuidedTraceCaptureForTests();
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.clear();
  });

  it('keeps a bounded ring buffer', () => {
    const excess = 40;
    for (let i = 0; i < GUIDED_TRACE_BUFFER_MAX + excess; i++) {
      appendGuidedTraceCapture(row(`n${i}`));
    }
    const events = getGuidedTraceEvents();
    expect(events.length).toBe(GUIDED_TRACE_BUFFER_MAX);
    expect(events[0]?.note).toBe(`n${excess}`);
  });

  it('hydrate merges persisted rows with in-memory buffer', async () => {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem(
      '@reclaim/dev_guided_trace_v1',
      JSON.stringify([
        { ts: '2026-01-01T00:00:00.000Z', source: 'ui', action: 'REST_START', note: 'from-disk' },
      ]),
    );
    appendGuidedTraceCapture(row('live'));
    await hydrateGuidedTraceCaptureFromStorage();
    const notes = getGuidedTraceEvents().map((e) => e.note).sort();
    expect(notes).toEqual(['from-disk', 'live']);
  });

  it('clearGuidedTraceEvents empties buffer and storage key', async () => {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    appendGuidedTraceCapture(row('a'));
    await clearGuidedTraceEvents();
    expect(getGuidedTraceEvents().length).toBe(0);
    const raw = await AsyncStorage.getItem('@reclaim/dev_guided_trace_v1');
    expect(raw).toBeNull();
  });

  it('formatGuidedTracesForExport returns valid JSON', () => {
    appendGuidedTraceCapture(row('x'));
    const json = formatGuidedTracesForExport(getGuidedTraceEvents());
    const parsed = JSON.parse(json) as { count: number; events: unknown[]; exportedAt: string };
    expect(parsed.count).toBe(1);
    expect(Array.isArray(parsed.events)).toBe(true);
    expect(typeof parsed.exportedAt).toBe('string');
  });
});

describe('guidedTraceCapture persistence debounce', () => {
  beforeEach(async () => {
    __resetGuidedTraceCaptureForTests();
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('writes AsyncStorage after debounce window', async () => {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    appendGuidedTraceCapture(row('debounced'));
    expect(await AsyncStorage.getItem('@reclaim/dev_guided_trace_v1')).toBeNull();
    await vi.advanceTimersByTimeAsync(500);
    const raw = await AsyncStorage.getItem('@reclaim/dev_guided_trace_v1');
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw as string)).toEqual(expect.any(Array));
  });
});
