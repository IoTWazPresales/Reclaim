/**
 * Durable evidence for accepting guided training notification actions when
 * AsyncStorage intent rows (scheduling metadata) are missing or were cleared.
 *
 * Intents are not the same as "this action is valid" — the OS payload + local
 * guided session snapshot can still prove an in-app session is active.
 */

import { supabase } from '@/lib/supabase';
import { hasIntent } from '@/lib/notifications/NotificationIntentStore';
import { loadGuidedActiveSessionSnapshot } from '@/lib/localData/guidedActiveSessionSnapshotRepository';
import type { GuidedActiveSessionSnapshot } from '@/lib/training/guidedActiveSessionSnapshot';
import { logger } from '@/lib/logger';

/** Max age for using guided snapshot to protect intent store from stale cleanup (not resume TTL). */
export const GUIDED_SNAPSHOT_INTENT_GUARD_MAX_MS = 6 * 60 * 60 * 1000;

export type GuidedSetDonePayload = {
  sessionId: string;
  sessionItemId: string;
  exerciseId: string;
  setIndex: number;
};

export type GuidedSetDoneAcceptanceResult = {
  accept: boolean;
  reason: string;
  evidence: 'intent_store' | 'guided_snapshot' | 'rejected';
  detail: Record<string, unknown>;
};

function intentKeysForSet(payload: GuidedSetDonePayload): { setIntentKey: string; firstIntentKey: string } {
  return {
    setIntentKey: `training_set:${payload.sessionId}:${payload.exerciseId}:${payload.setIndex}`,
    firstIntentKey: `training_first:${payload.sessionId}:${payload.exerciseId}:1`,
  };
}

/**
 * Snapshot aligns with the SET_DONE payload: same guided session row + same focused set index.
 */
export function snapshotSupportsSetDonePayload(
  snap: GuidedActiveSessionSnapshot | null,
  payload: GuidedSetDonePayload,
): boolean {
  if (!snap || snap.notificationMode !== 'guided') return false;
  if (snap.sessionId !== payload.sessionId) return false;
  if (!snap.sessionItemId || snap.sessionItemId !== payload.sessionItemId) return false;
  if (!snap.exerciseId || snap.exerciseId !== payload.exerciseId) return false;
  return snap.currentSetIndex === payload.setIndex;
}

export function describeSnapshotMismatch(
  snap: GuidedActiveSessionSnapshot | null,
  payload: GuidedSetDonePayload,
): string {
  if (!snap) return 'no_snapshot';
  if (snap.notificationMode !== 'guided') return 'snapshot_not_guided';
  if (snap.sessionId !== payload.sessionId) return 'snapshot_session_mismatch';
  if (!snap.sessionItemId || snap.sessionItemId !== payload.sessionItemId) return 'snapshot_session_item_mismatch';
  if (!snap.exerciseId || snap.exerciseId !== payload.exerciseId) return 'snapshot_exercise_mismatch';
  if (snap.currentSetIndex !== payload.setIndex) return 'snapshot_set_index_mismatch';
  return 'snapshot_ok';
}

/** Block clearing training intents when a fresh guided snapshot indicates an active guided session. */
export function shouldPreserveTrainingIntentsDueToGuidedSnapshot(
  snapshot: GuidedActiveSessionSnapshot | null,
  nowMs: number,
  maxAgeMs: number,
): boolean {
  if (!snapshot?.sessionId || snapshot.notificationMode !== 'guided') return false;
  const updatedAt = Date.parse(snapshot.updatedAt);
  if (!Number.isFinite(updatedAt)) return false;
  const age = nowMs - updatedAt;
  return age >= 0 && age <= maxAgeMs;
}

/**
 * Accept SET_DONE when scheduling intents exist OR guided snapshot matches payload (same session/set focus).
 */
export async function evaluateGuidedSetDoneAcceptance(payload: GuidedSetDonePayload): Promise<GuidedSetDoneAcceptanceResult> {
  const { setIntentKey, firstIntentKey } = intentKeysForSet(payload);
  const intentCurrent = await hasIntent(setIntentKey);
  const intentFirst = payload.setIndex === 1 && (await hasIntent(firstIntentKey));
  const intentActive = intentCurrent || intentFirst;

  let snapshot: GuidedActiveSessionSnapshot | null = null;
  let authReason = 'ok';
  try {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (!uid) {
      authReason = 'no_auth_user';
    } else {
      snapshot = await loadGuidedActiveSessionSnapshot(uid);
    }
  } catch (e) {
    authReason = 'auth_or_snapshot_load_error';
    logger.debug('[GUIDED_NOTIF_ACTION] snapshot load failed', { message: (e as Error)?.message });
  }

  const snapshotMatch = snapshotSupportsSetDonePayload(snapshot, payload);
  const mismatchTag = describeSnapshotMismatch(snapshot, payload);

  const detail: Record<string, unknown> = {
    sessionId: payload.sessionId,
    sessionItemId: payload.sessionItemId,
    exerciseId: payload.exerciseId,
    setIndex: payload.setIndex,
    intentCurrent,
    intentFirst,
    intentKeys: { setIntentKey, firstIntentKey },
    snapshotPresent: !!snapshot,
    snapshotMatch,
    snapshotMismatch: snapshotMatch ? null : mismatchTag,
    authReason,
  };

  if (intentActive) {
    return {
      accept: true,
      reason: 'intent_store_present',
      evidence: 'intent_store',
      detail: { ...detail, evidencePath: 'intent_store' },
    };
  }
  if (snapshotMatch) {
    return {
      accept: true,
      reason: 'guided_snapshot_matches_payload',
      evidence: 'guided_snapshot',
      detail: { ...detail, evidencePath: 'guided_snapshot' },
    };
  }

  return {
    accept: false,
    reason: `rejected_no_intent_${mismatchTag}`,
    evidence: 'rejected',
    detail: { ...detail, evidencePath: 'rejected' },
  };
}
