/**
 * Persists guided active-session snapshots under `reclaim_async_blob_mirror` domain
 * `guided_active_session`. User id is the blob row key (same pattern as offline queue).
 *
 * Callers must pass `user_id` from the training session row — no Supabase auth required.
 */

import {
  ASYNC_MIRROR_DOMAIN,
  clearBlobMirrorForDomain,
  loadBlobMirrorForUser,
  replaceBlobMirror,
} from '@/lib/localData/smallModuleMirrors';
import {
  parseGuidedActiveSessionSnapshot,
  type GuidedActiveSessionSnapshot,
} from '@/lib/training/guidedActiveSessionSnapshot';
import { logger } from '@/lib/logger';

export async function saveGuidedActiveSessionSnapshot(
  userId: string,
  snapshot: GuidedActiveSessionSnapshot,
): Promise<void> {
  if (!userId?.trim()) return;
  await replaceBlobMirror(ASYNC_MIRROR_DOMAIN.guidedActiveSession, userId, snapshot);
}

/** Fire-and-forget; failures must not interrupt workouts */
export function scheduleGuidedActiveSessionSnapshotSave(
  userId: string,
  snapshot: GuidedActiveSessionSnapshot,
): void {
  void saveGuidedActiveSessionSnapshot(userId, snapshot).catch((e) =>
    logger.debug('[guidedActiveSessionSnapshot]', (e as Error)?.message),
  );
}

export async function loadGuidedActiveSessionSnapshot(
  userId: string,
): Promise<GuidedActiveSessionSnapshot | null> {
  if (!userId?.trim()) return null;
  const raw = await loadBlobMirrorForUser(ASYNC_MIRROR_DOMAIN.guidedActiveSession, userId);
  return parseGuidedActiveSessionSnapshot(raw);
}

export async function clearGuidedActiveSessionSnapshot(userId: string): Promise<void> {
  if (!userId?.trim()) return;
  await clearBlobMirrorForDomain(ASYNC_MIRROR_DOMAIN.guidedActiveSession, userId);
}

export function scheduleClearGuidedActiveSessionSnapshot(userId: string): void {
  void clearGuidedActiveSessionSnapshot(userId).catch((e) =>
    logger.debug('[guidedActiveSessionSnapshot clear]', (e as Error)?.message),
  );
}
