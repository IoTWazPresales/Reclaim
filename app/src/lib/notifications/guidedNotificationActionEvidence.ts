/**
 * Evidence for accepting guided training notification actions.
 * Intent store is the sole authority now that the SQLite snapshot system is removed.
 */

import { hasIntent } from '@/lib/notifications/NotificationIntentStore';

export type GuidedSetDonePayload = {
  sessionId: string;
  sessionItemId: string;
  exerciseId: string;
  setIndex: number;
};

export type GuidedSetDoneAcceptanceResult = {
  accept: boolean;
  reason: string;
  evidence: 'intent_store' | 'rejected';
  detail: Record<string, unknown>;
};

function intentKeysForSet(payload: GuidedSetDonePayload): { setIntentKey: string; firstIntentKey: string } {
  return {
    setIntentKey: `training_set:${payload.sessionId}:${payload.exerciseId}:${payload.setIndex}`,
    firstIntentKey: `training_first:${payload.sessionId}:${payload.exerciseId}:1`,
  };
}

export async function evaluateGuidedSetDoneAcceptance(payload: GuidedSetDonePayload): Promise<GuidedSetDoneAcceptanceResult> {
  const { setIntentKey, firstIntentKey } = intentKeysForSet(payload);
  const intentCurrent = await hasIntent(setIntentKey);
  const intentFirst = payload.setIndex === 1 && (await hasIntent(firstIntentKey));
  const intentActive = intentCurrent || intentFirst;

  const detail: Record<string, unknown> = {
    sessionId: payload.sessionId,
    sessionItemId: payload.sessionItemId,
    exerciseId: payload.exerciseId,
    setIndex: payload.setIndex,
    intentCurrent,
    intentFirst,
    intentKeys: { setIntentKey, firstIntentKey },
  };

  if (intentActive) {
    return {
      accept: true,
      reason: 'intent_store_present',
      evidence: 'intent_store',
      detail: { ...detail, evidencePath: 'intent_store' },
    };
  }

  return {
    accept: false,
    reason: 'rejected_no_intent',
    evidence: 'rejected',
    detail: { ...detail, evidencePath: 'rejected' },
  };
}
