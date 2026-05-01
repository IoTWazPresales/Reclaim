export type { LocalDbInitResult, LocalDbInitStatus, SyncDomainKey } from '@/lib/localData/types';
export {
  __resetLocalDatabaseForTests,
  getLocalDbLastError,
  getLocalDbStatus,
  initializeLocalDatabase,
  requireLocalDatabase,
  runMigrations,
} from '@/lib/localData/database';
export { LOCAL_DB_MIGRATIONS } from '@/lib/localData/migrations';
export {
  mergeRemoteSleepSessionsIntoLocal,
  listLocalSleepSessions,
  deleteLocalSleepSessionsByIds,
} from '@/lib/localData/localSleepRepository';
export {
  saveHealthIntegrationSnapshot,
  loadHealthIntegrationSnapshot,
} from '@/lib/localData/healthIntegrationSnapshotRepository';
export { fetchIntegrationStatusesWithSnapshot } from '@/lib/localData/integrationStatusReadModel';
export { primeLocalFirstReadCaches } from '@/lib/localData/localFirstCachePrime';
