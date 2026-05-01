/**
 * Phase 3.5 — mirror read helpers (dedupe / validation).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
  getAllAsync: vi.fn(),
}));

vi.mock('expo-sqlite', () => ({
  openDatabaseAsync: vi.fn(async () => ({
    execAsync: vi.fn(),
    getFirstAsync: vi.fn(async (sql: string) => {
      if (String(sql).includes('user_version')) return { user_version: 3 };
      return null;
    }),
    runAsync: vi.fn(),
    getAllAsync: hoisted.getAllAsync,
    withTransactionAsync: vi.fn(async (fn: () => Promise<void>) => {
      await fn();
    }),
  })),
}));

describe('smallModuleMirrors — mood pending mirror read', () => {
  beforeEach(async () => {
    hoisted.getAllAsync.mockReset();
    vi.resetModules();
    const { __resetLocalDatabaseForTests } = await import('@/lib/localData/database');
    __resetLocalDatabaseForTests();
  });

  afterEach(async () => {
    const { __resetLocalDatabaseForTests } = await import('@/lib/localData/database');
    __resetLocalDatabaseForTests();
  });

  it('dedupes duplicate local_id rows (first wins)', async () => {
    const row = {
      localId: 'same',
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
    hoisted.getAllAsync.mockResolvedValue([
      { payload_json: JSON.stringify({ ...row, rating: 1 }) },
      { payload_json: JSON.stringify({ ...row, rating: 5 }) },
    ]);

    const { loadMoodPendingMirrorForUser } = await import('@/lib/localData/smallModuleMirrors');
    const out = await loadMoodPendingMirrorForUser('user-1');
    expect(out).toHaveLength(1);
    expect(out[0].localId).toBe('same');
    expect(out[0].rating).toBe(1);
  });
});
