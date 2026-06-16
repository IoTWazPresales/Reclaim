import { getAllIntegrationStatuses } from '@/lib/health/integrationStore';
import { initializeLocalDatabase } from '@/lib/localData/database';
import { saveHealthIntegrationSnapshot } from '@/lib/localData/healthIntegrationSnapshotRepository';
import { logger } from '@/lib/logger';

/** Loads live AsyncStorage integration state and mirrors it to SQLite for fast cold-start reads. */
export async function fetchIntegrationStatusesWithSnapshot(userId: string | undefined) {
  const live = await getAllIntegrationStatuses();
  if (userId) {
    try {
      const r = await initializeLocalDatabase();
      if (r.ok) await saveHealthIntegrationSnapshot(userId, live);
    } catch (e) {
      logger.debug('[fetchIntegrationStatusesWithSnapshot] snapshot persist failed', (e as Error)?.message);
    }
  }
  return live;
}
