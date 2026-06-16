import type { StoredConnections } from '@/lib/health/integrationStore';
import { initializeLocalDatabase, requireLocalDatabase } from '@/lib/localData/database';
import { logger } from '@/lib/logger';

export async function saveHealthIntegrationSnapshot(userId: string, connections: StoredConnections): Promise<void> {
  const init = await initializeLocalDatabase();
  if (!init.ok) return;

  const db = requireLocalDatabase();
  const payload = JSON.stringify(connections ?? {});
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT OR REPLACE INTO reclaim_health_integration_snapshot (user_id, payload_json, updated_at)
     VALUES (?, ?, ?)`,
    [userId, payload, now],
  );
}

export async function loadHealthIntegrationSnapshot(userId: string): Promise<StoredConnections | null> {
  const init = await initializeLocalDatabase();
  if (!init.ok) return null;

  try {
    const db = requireLocalDatabase();
    const row = await db.getFirstAsync<{ payload_json: string }>(
      `SELECT payload_json FROM reclaim_health_integration_snapshot WHERE user_id = ?`,
      [userId],
    );
    if (!row?.payload_json) return null;
    return JSON.parse(row.payload_json) as StoredConnections;
  } catch (e) {
    logger.debug('[loadHealthIntegrationSnapshot] failed', (e as Error)?.message);
    return null;
  }
}
