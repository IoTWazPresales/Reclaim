import { beforeEach, describe, expect, it, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';

vi.mock('expo-sqlite', () => ({
  openDatabaseAsync: vi.fn(async () => ({
    execAsync: vi.fn(async () => {}),
    runAsync: vi.fn(async () => {}),
    getFirstAsync: vi.fn(async () => null),
    getAllAsync: vi.fn(async () => []),
    withTransactionAsync: vi.fn(async (fn: () => Promise<void>) => {
      await fn();
    }),
  })),
}));

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

const invalidateMock = vi.fn(async () => undefined);
vi.mock('@/lib/queryClient', () => ({
  queryClient: {
    invalidateQueries: invalidateMock,
  },
}));

const moodState = {
  serverRows: [] as Record<string, unknown>[],
  upsertSingleResult: { data: null as Record<string, unknown> | null, error: null as { code?: string; message?: string } | null },
};

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })),
    },
    from: vi.fn((table: string) => {
      if (table === 'mood_entries') {
        return {
          upsert: () => Promise.resolve({ error: null }),
        };
      }
      if (table !== 'mood_checkins') {
        return {};
      }
      return {
        select() {
          return {
            eq(_col: string, val: string) {
              return {
                limit: async () => ({ data: [...moodState.serverRows], error: null }),
                maybeSingle: async () => {
                  const row = moodState.serverRows.find((r) => r.id === val);
                  return { data: row ?? null, error: null };
                },
                gte() {
                  return {
                    lte() {
                      return {
                        order: async () => ({ data: [], error: null }),
                      };
                    },
                  };
                },
              };
            },
          };
        },
        upsert(row: Record<string, unknown>) {
          return {
            select() {
              return {
                single: async () => ({
                  data: moodState.upsertSingleResult.data ?? row,
                  error: moodState.upsertSingleResult.error,
                }),
              };
            },
          };
        },
      };
    }),
  },
}));

describe('moodService device-first + replay', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    vi.resetModules();
    moodState.serverRows = [];
    moodState.upsertSingleResult = { data: null, error: null };
    invalidateMock.mockClear();
  });

  it('replayAllPendingMoodCheckinsForSync removes pending only after successful upsert', async () => {
    const { appendPendingMoodCheckin, loadPendingMoodCheckins, MOOD_PENDING_KEY_V2 } = await import('../moodOutbox');
    await appendPendingMoodCheckin({
      localId: 'pending-1',
      rating: 4,
      ts: '2025-06-01T12:00:00.000Z',
      day_date: '2025-06-01',
      note: null,
      tags: null,
      energy: null,
      source: 'manual',
      enqueuedAt: '2025-06-01T12:00:00.000Z',
      retryCount: 0,
      kind: 'user',
    });

    const { replayAllPendingMoodCheckinsForSync } = await import('../moodService');
    const n = await replayAllPendingMoodCheckinsForSync();
    expect(n).toBe(1);
    expect(await loadPendingMoodCheckins()).toEqual([]);
    expect(invalidateMock).toHaveBeenCalled();
    expect(await AsyncStorage.getItem(MOOD_PENDING_KEY_V2)).toBe(JSON.stringify([]));
  });

  it('replay keeps durable pending when upsert fails', async () => {
    moodState.upsertSingleResult = { data: null, error: { message: 'offline' } };
    const { appendPendingMoodCheckin, loadPendingMoodCheckins } = await import('../moodOutbox');
    await appendPendingMoodCheckin({
      localId: 'pending-fail',
      rating: 2,
      ts: '2025-06-02T12:00:00.000Z',
      day_date: '2025-06-02',
      note: null,
      tags: null,
      energy: null,
      source: 'manual',
      enqueuedAt: '2025-06-02T12:00:00.000Z',
      retryCount: 0,
      kind: 'user',
    });

    const { replayAllPendingMoodCheckinsForSync } = await import('../moodService');
    await replayAllPendingMoodCheckinsForSync();
    const left = await loadPendingMoodCheckins();
    expect(left.length).toBe(1);
    expect(left[0].localId).toBe('pending-fail');
    expect(left[0].retryCount).toBeGreaterThanOrEqual(1);
    expect(invalidateMock).not.toHaveBeenCalled();
  });

  it('treats unique violation as synced and clears pending', async () => {
    moodState.upsertSingleResult = { data: null, error: { code: '23505', message: 'duplicate' } };
    const { appendPendingMoodCheckin, loadPendingMoodCheckins } = await import('../moodOutbox');
    await appendPendingMoodCheckin({
      localId: 'dup-id',
      rating: 3,
      ts: '2025-06-03T12:00:00.000Z',
      day_date: '2025-06-03',
      note: null,
      tags: null,
      energy: null,
      source: 'manual',
      enqueuedAt: '2025-06-03T12:00:00.000Z',
      retryCount: 0,
      kind: 'user',
    });

    const { replayAllPendingMoodCheckinsForSync } = await import('../moodService');
    await replayAllPendingMoodCheckinsForSync();
    expect(await loadPendingMoodCheckins()).toEqual([]);
  });

  it('getCanonicalMoodCheckinsMerged surfaces pending when server is empty', async () => {
    const { appendPendingMoodCheckin } = await import('../moodOutbox');
    await appendPendingMoodCheckin({
      localId: 'surface-1',
      rating: 5,
      ts: '2025-07-01T15:00:00.000Z',
      day_date: '2025-07-01',
      note: null,
      tags: null,
      energy: null,
      source: 'manual',
      enqueuedAt: '2025-07-01T15:00:00.000Z',
      retryCount: 0,
      kind: 'user',
    });

    const { getCanonicalMoodCheckinsMerged } = await import('../moodService');
    const merged = await getCanonicalMoodCheckinsMerged(20);
    expect(merged.some((m) => m.id === 'surface-1' && m.mood === 5)).toBe(true);
  });

  it('listMoodCheckins uses canonical merge (api delegation)', async () => {
    const { appendPendingMoodCheckin } = await import('../moodOutbox');
    await appendPendingMoodCheckin({
      localId: 'api-path-1',
      rating: 4,
      ts: '2025-08-01T10:00:00.000Z',
      day_date: '2025-08-01',
      note: null,
      tags: null,
      energy: null,
      source: 'manual',
      enqueuedAt: '2025-08-01T10:00:00.000Z',
      retryCount: 0,
      kind: 'user',
    });

    const api = await import('@/lib/api');
    const rows = await api.listMoodCheckins(30);
    expect(rows.some((m) => m.id === 'api-path-1')).toBe(true);
  });

  it('submitCreateMoodCheckinDeviceFirst persists pending then invalidates on success', async () => {
    const { loadPendingMoodCheckins } = await import('../moodOutbox');
    const { submitCreateMoodCheckinDeviceFirst } = await import('../moodService');

    const row = await submitCreateMoodCheckinDeviceFirst({ rating: 4, note: 'hi' });
    expect(row.mood).toBe(4);
    expect(await loadPendingMoodCheckins()).toEqual([]);
    expect(invalidateMock).toHaveBeenCalled();
  });

  it('pending outbox survives module reload (restart-like)', async () => {
    const { appendPendingMoodCheckin } = await import('../moodOutbox');
    await appendPendingMoodCheckin({
      localId: 'restart-pending',
      rating: 3,
      ts: '2025-09-01T11:00:00.000Z',
      day_date: '2025-09-01',
      note: null,
      tags: null,
      energy: null,
      source: 'manual',
      enqueuedAt: '2025-09-01T11:00:00.000Z',
      retryCount: 0,
      kind: 'user',
    });
    vi.resetModules();
    const { loadPendingMoodCheckins } = await import('../moodOutbox');
    const rows = await loadPendingMoodCheckins();
    expect(rows.some((r) => r.localId === 'restart-pending')).toBe(true);
  });
});
