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
  loadRecoveryProgressForUser,
  saveRecoveryProgressForUser,
  tryMigrateRecoveryFromAsyncStorage,
  RECOVERY_PROGRESS_LEGACY_STORAGE_KEY,
} from '@/lib/localData/recoveryProgressRepository';
export {
  loadMeditationSessionsForUser,
  saveMeditationSessionsForUser,
  tryMigrateMeditationsFromAsyncStorage,
  MEDITATION_LEGACY_ASYNC_STORAGE_KEY,
} from '@/lib/localData/meditationSessionsRepository';
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
export {
  scheduleMoodPendingMirror,
  scheduleMedDoseQueueMirror,
  scheduleMeditationSessionsMirror,
  scheduleRecoveryProgressMirror,
  scheduleTrainingOfflineQueueMirror,
  ASYNC_MIRROR_DOMAIN,
} from '@/lib/localData/smallModuleMirrors';
export {
  loadRoutineDayStateForUser,
  saveRoutineDayStateForUser,
  tryMigrateRoutineDayFromAsyncStorage,
} from '@/lib/localData/routineDayStateRepository';
export {
  writeSyncMetadataBestEffort,
  readSyncMetadataForDomain,
  recordHealthPullSyncMetadata,
  type SyncMetadataRow,
  type SyncMetadataPatch,
} from '@/lib/localData/syncMetadataRepository';
export {
  exportLocalDataSectionForUser,
  clearAllLocalDataForUser,
  type LocalDataExportSection,
} from '@/lib/localData/localDataPrivacy';
