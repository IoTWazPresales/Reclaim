import { beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => {
  const store = new Map<string, string>();
  const keyOf = (userId: string, cacheKey: string) => `${userId}::${cacheKey}`;
  const mockDb = {
    getFirstAsync: vi.fn(async (sql: string, params?: unknown[]) => {
      if (!String(sql).includes('reclaim_read_cache')) return null;
      const userId = params?.[0] as string;
      const ck = params?.[1] as string;
      const json = store.get(keyOf(userId, ck));
      if (!json) return null;
      return { payload_json: json };
    }),
    runAsync: vi.fn(async (sql: string, params?: unknown[]) => {
      const s = String(sql);
      if (s.includes('reclaim_read_cache') && s.toUpperCase().includes('INSERT')) {
        const userId = params?.[0] as string;
        const cacheKey = params?.[1] as string;
        const payload = params?.[2] as string;
        store.set(keyOf(userId, cacheKey), payload);
      }
    }),
  };
  return { store, keyOf, mockDb };
});

vi.mock('@/lib/localData/database', () => ({
  initializeLocalDatabase: vi.fn(async () => ({ ok: true, status: 'ready' as const })),
  requireLocalDatabase: () => hoisted.mockDb,
  __resetLocalDatabaseForTests: vi.fn(() => {
    hoisted.store.clear();
    hoisted.mockDb.getFirstAsync.mockClear();
    hoisted.mockDb.runAsync.mockClear();
  }),
}));

describe('readCacheRepository', () => {
  beforeEach(() => {
    hoisted.store.clear();
    vi.resetModules();
  });

  it('saveReadCache and loadReadCache round-trip JSON payloads', async () => {
    const { saveReadCache, loadReadCache, readCacheKeys } = await import('../readCacheRepository');

    await saveReadCache('u1', readCacheKeys.meds, [{ id: 'm1', name: 'x' }]);
    const rows = await loadReadCache<Array<{ id: string; name: string }>>('u1', readCacheKeys.meds);
    expect(rows?.length).toBe(1);
    expect(rows?.[0]?.id).toBe('m1');
  });

  it('deleteReadCacheForUser clears keys for that user', async () => {
    const { saveReadCache, loadReadCache, readCacheKeys, deleteReadCacheForUser } = await import(
      '../readCacheRepository'
    );

    await saveReadCache('u1', readCacheKeys.meds, []);
    await deleteReadCacheForUser('u1');

    const mockDel = vi.mocked(hoisted.mockDb.runAsync);
    expect(mockDel.mock.calls.some((c) => String(c[0]).includes('DELETE FROM reclaim_read_cache'))).toBe(true);
  });
});
