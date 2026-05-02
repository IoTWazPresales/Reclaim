/**
 * Canonical recovery progression in localData (`reclaim_async_blob_mirror` domain `recovery_progress`).
 * AsyncStorage `recovery:progress:v1` is legacy compatibility + migration source.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  ASYNC_MIRROR_DOMAIN,
  isValidRecoveryProgressPayload,
  loadBlobMirrorForUser,
  replaceBlobMirror,
} from '@/lib/localData/smallModuleMirrors';
import { logger } from '@/lib/logger';
import type { RecoveryStageId, StoredRecoveryProgress } from '@/lib/recovery';

export const RECOVERY_PROGRESS_LEGACY_STORAGE_KEY = 'recovery:progress:v1';

const MERGE_DEFAULT: StoredRecoveryProgress = {
  currentStageId: 'foundation',
  startedAt: new Date().toISOString(),
  completedStageIds: [],
  currentWeek: 1,
  recoveryType: null,
};

function mergeRecoveryPayload(parsed: Record<string, unknown>): StoredRecoveryProgress {
  return {
    ...MERGE_DEFAULT,
    ...parsed,
    currentStageId: parsed.currentStageId as RecoveryStageId,
    completedStageIds: Array.isArray(parsed.completedStageIds)
      ? (parsed.completedStageIds as RecoveryStageId[])
      : [],
  };
}

function tryParseLegacyRaw(raw: string | null): StoredRecoveryProgress | null {
  if (raw === null || raw === '') return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed?.currentStageId) return null;
    return mergeRecoveryPayload(parsed);
  } catch {
    return null;
  }
}

export async function loadRecoveryProgressForUser(userId: string): Promise<StoredRecoveryProgress | null> {
  const blob = await loadBlobMirrorForUser(ASYNC_MIRROR_DOMAIN.recoveryProgress, userId);
  if (blob == null) return null;
  if (!isValidRecoveryProgressPayload(blob)) return null;
  return mergeRecoveryPayload(blob as Record<string, unknown>);
}

export async function saveRecoveryProgressForUser(
  userId: string,
  progress: StoredRecoveryProgress,
): Promise<void> {
  await replaceBlobMirror(ASYNC_MIRROR_DOMAIN.recoveryProgress, userId, progress);
}

/**
 * One-way idempotent migration: if SQLite has no valid row, promote legacy AsyncStorage into canonical store.
 */
export async function tryMigrateRecoveryFromAsyncStorage(userId: string): Promise<StoredRecoveryProgress | null> {
  const raw = await AsyncStorage.getItem(RECOVERY_PROGRESS_LEGACY_STORAGE_KEY);
  const fromAs = tryParseLegacyRaw(raw);
  if (!fromAs) return null;

  await saveRecoveryProgressForUser(userId, fromAs);
  logger.info('[recovery] Migrated legacy AsyncStorage to localData (canonical recovery progress)');
  return fromAs;
}
