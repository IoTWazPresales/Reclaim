import { beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => {
  const lastDeleteCalls: Array<{ sql: string; params?: unknown[] }> = [];
  const mockDb = {
    getAllAsync: vi.fn(async (sql: string, params?: unknown[]) => {
      const s = String(sql);
      if (s.includes('reclaim_sync_metadata')) {
        return [{ domain: 'mood', last_success_at: '2026-01-01', last_attempt_at: '2026-01-01', last_error: null, pending_count: 0, provider_watermark: null, updated_at: '2026-01-01' }];
      }
      if (s.includes('reclaim_local_sleep_session')) {
        return [
          {
            id: 's1',
            payload_json: '{"x":1}',
            start_time: '2026-01-01T00:00:00.000Z',
            end_time: '2026-01-01T08:00:00.000Z',
          },
        ];
      }
      if (s.includes('reclaim_mood_pending')) {
        return [{ payload_json: '{"localId":"a"}' }];
      }
      if (s.includes('reclaim_async_blob_mirror')) {
        return [{ domain: 'med_dose_queue', payload_json: '[]' }];
      }
      if (s.includes('reclaim_routine_day_state')) {
        return [{ day_date: '2026-05-01', payload_json: '{}' }];
      }
      return [];
    }),
    getFirstAsync: vi.fn(async (sql: string, params?: unknown[]) => {
      if (String(sql).includes('reclaim_health_integration_snapshot')) {
        return { payload_json: '{"apple":true}' };
      }
      return null;
    }),
    runAsync: vi.fn(async (sql: string, params?: unknown[]) => {
      lastDeleteCalls.push({ sql, params });
    }),
    withTransactionAsync: vi.fn(async (fn: () => Promise<void>) => {
      await fn();
    }),
  };
  return { mockDb, lastDeleteCalls };
});

vi.mock('@/lib/localData/database', () => ({
  initializeLocalDatabase: vi.fn(async () => ({ ok: true, status: 'ready' as const })),
  requireLocalDatabase: () => hoisted.mockDb,
  __resetLocalDatabaseForTests: vi.fn(() => {
    hoisted.lastDeleteCalls.length = 0;
    hoisted.mockDb.getAllAsync.mockClear();
    hoisted.mockDb.runAsync.mockClear();
  }),
}));

describe('localDataPrivacy', () => {
  beforeEach(() => {
    hoisted.lastDeleteCalls.length = 0;
    vi.resetModules();
  });

  it('exportLocalDataSectionForUser returns structured sections without throwing', async () => {
    const { exportLocalDataSectionForUser } = await import('../localDataPrivacy');
    const out = await exportLocalDataSectionForUser('user-1');
    expect('error' in out).toBe(false);
    if ('error' in out) return;
    expect(out.schemaVersion).toBe(1);
    expect(out.reclaim_sync_metadata.length).toBeGreaterThan(0);
    expect(out.reclaim_local_sleep_session[0]?.id).toBe('s1');
    expect(out.reclaim_mood_pending.length).toBe(1);
    expect(out.reclaim_async_blob_mirror[0]?.domain).toBe('med_dose_queue');
    expect(JSON.stringify(out)).not.toMatch(/access_token|refresh_token|secret/i);
  });

  it('clearAllLocalDataForUser runs deletes idempotently', async () => {
    const { clearAllLocalDataForUser } = await import('../localDataPrivacy');
    const r1 = await clearAllLocalDataForUser('user-1');
    expect(r1.ok).toBe(true);
    expect(hoisted.mockDb.runAsync).toHaveBeenCalled();
    const r2 = await clearAllLocalDataForUser('user-1');
    expect(r2.ok).toBe(true);
  });

  it('clearAllLocalDataForUser rejects empty user id', async () => {
    const { clearAllLocalDataForUser } = await import('../localDataPrivacy');
    const r = await clearAllLocalDataForUser('  ');
    expect(r.ok).toBe(false);
  });
});
