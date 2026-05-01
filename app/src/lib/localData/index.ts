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
