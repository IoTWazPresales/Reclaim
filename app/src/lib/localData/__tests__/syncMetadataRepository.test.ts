import { beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => {
  const rows = new Map<string, Record<string, unknown>>();
  const mockDb = {
    getFirstAsync: vi.fn(async (_sql: string, params?: unknown[]) => {
      const domain = params?.[0] as string;
      return rows.get(domain) ?? null;
    }),
    runAsync: vi.fn(async (_sql: string, params?: unknown[]) => {
      const [
        domain,
        last_success_at,
        last_attempt_at,
        last_error,
        pending_count,
        stale_after_seconds,
        next_desired_sync_at,
        provider_watermark,
        updated_at,
      ] = params ?? [];
      rows.set(domain as string, {
        domain,
        last_success_at,
        last_attempt_at,
        last_error,
        pending_count,
        stale_after_seconds,
        next_desired_sync_at,
        provider_watermark,
        updated_at,
      });
    }),
  };
  return { rows, mockDb };
});

vi.mock('@/lib/localData/database', () => ({
  initializeLocalDatabase: vi.fn(async () => ({ ok: true, status: 'ready' as const })),
  requireLocalDatabase: () => hoisted.mockDb,
  __resetLocalDatabaseForTests: vi.fn(() => {
    hoisted.rows.clear();
    hoisted.mockDb.getFirstAsync.mockClear();
    hoisted.mockDb.runAsync.mockClear();
  }),
}));

describe('syncMetadataRepository', () => {
  beforeEach(() => {
    hoisted.rows.clear();
    hoisted.mockDb.getFirstAsync.mockClear();
    hoisted.mockDb.runAsync.mockClear();
    vi.resetModules();
  });

  it('writeSyncMetadataBestEffort inserts then merges preserving last_success when omitted', async () => {
    const { writeSyncMetadataBestEffort, readSyncMetadataForDomain } = await import('../syncMetadataRepository');

    await writeSyncMetadataBestEffort({
      domain: 'mood',
      last_attempt_at: '2026-05-01T10:00:00.000Z',
      last_success_at: '2026-05-01T10:00:00.000Z',
      last_error: null,
      pending_count: 2,
    });

    await writeSyncMetadataBestEffort({
      domain: 'mood',
      last_attempt_at: '2026-05-01T11:00:00.000Z',
      pending_count: 1,
    });

    const row = await readSyncMetadataForDomain('mood');
    expect(row?.last_success_at).toBe('2026-05-01T10:00:00.000Z');
    expect(row?.last_attempt_at).toBe('2026-05-01T11:00:00.000Z');
    expect(row?.pending_count).toBe(1);
  });

  it('recordHealthPullSyncMetadata writes sleep and health_daily rows', async () => {
    const { recordHealthPullSyncMetadata, readSyncMetadataForDomain } = await import('../syncMetadataRepository');

    await recordHealthPullSyncMetadata(
      {
        sleepSynced: true,
        activitySynced: true,
        syncedAt: '2026-05-02T12:00:00.000Z',
        debug: { sleepSyncStatus: 'synced' },
      },
      'dashboard_manual',
    );

    const sleep = await readSyncMetadataForDomain('sleep');
    const daily = await readSyncMetadataForDomain('health_daily');
    expect(sleep?.last_success_at).toBe('2026-05-02T12:00:00.000Z');
    expect(daily?.last_success_at).toBe('2026-05-02T12:00:00.000Z');
    expect(sleep?.provider_watermark).toContain('dashboard_manual');
  });
});
