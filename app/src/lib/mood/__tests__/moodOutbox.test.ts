import { describe, it, expect, beforeEach, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

describe('moodOutbox', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    vi.resetModules();
  });

  it('dedupes append by localId', async () => {
    const mod = await import('../moodOutbox');
    const base = {
      localId: 'same-id',
      rating: 4,
      ts: '2025-06-01T10:00:00.000Z',
      day_date: '2025-06-01',
      note: null,
      tags: null,
      energy: null,
      source: 'manual',
      enqueuedAt: '2025-06-01T10:00:00.000Z',
      retryCount: 0,
      kind: 'user' as const,
    };
    await mod.appendPendingMoodCheckin(base);
    await mod.appendPendingMoodCheckin({ ...base, rating: 5 });
    const rows = await mod.loadPendingMoodCheckins();
    expect(rows.length).toBe(1);
    expect(rows[0].rating).toBe(5);
  });
});
