/**
 * Pure planning decisions for guided TRAINING_SET / TRAINING_REST intents.
 * No Expo imports — safe for unit tests.
 *
 * Timed (training_at) intents use absolute scheduledAt. When wall-clock passes
 * before OS delivery (inexact alarms), reconcile must NOT drop them from the
 * desired plan or the diff cancels the still-pending OS alarm. Within
 * TIMED_PROMPT_CANCEL_GRACE_MS we keep the planned entry with the same
 * scheduledAt/identifier so planSignature matches and cancel/reschedule is a no-op.
 * firedAt (written on actual delivery) is the hard exclude.
 */

/** How long after scheduledAt a not-yet-fired timed prompt stays in the reconcile plan. */
export const TIMED_PROMPT_CANCEL_GRACE_MS = 10 * 60 * 1000;

export type TrainingPromptIntentFields = {
  type: 'TRAINING_SET' | 'TRAINING_REST';
  sessionId: string;
  issuedAt?: string;
  scheduledAt?: string;
  firedAt?: string;
  /**
   * FGS-alive rest-end timer requested immediate delivery on the timed OS id
   * (`reclaim-training-at-*`). Reconcile cancels any pending date alarm and
   * presents now; then firedAt write-back excludes from later plans.
   */
  deliverNow?: boolean;
  title?: string;
  body?: string;
  chronometerCountDown?: boolean;
  chronometerBaseTime?: number;
};

export type TrainingPromptPlanSkip = { action: 'skip'; reason: string };

export type TrainingPromptPlanImmediate = {
  action: 'immediate';
  identifier: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  trigger: null;
  channelId: 'training';
  categoryIdentifier: 'TRAINING_SET' | 'TRAINING_REST';
};

export type TrainingPromptPlanTimed = {
  action: 'timed';
  identifier: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  /** Absolute fire time — may be in the past while still inside cancel grace. */
  fireAt: Date;
  channelId: 'training';
  categoryIdentifier: 'TRAINING_SET' | 'TRAINING_REST';
};

export type TrainingPromptPlanDecision =
  | TrainingPromptPlanSkip
  | TrainingPromptPlanImmediate
  | TrainingPromptPlanTimed;

function buildPromptData(
  d: TrainingPromptIntentFields,
  appTag: string,
  includeScheduledAt: boolean,
): Record<string, unknown> {
  const promptData: Record<string, unknown> = {
    type: d.type,
    sessionId: d.sessionId,
    issuedAt: d.issuedAt,
    appTag,
  };
  if (d.chronometerCountDown === true && d.chronometerBaseTime != null) {
    promptData.chronometerCountDown = true;
    promptData.chronometerBaseTime = d.chronometerBaseTime;
  }
  if (includeScheduledAt && d.scheduledAt) {
    promptData.scheduledAt = d.scheduledAt;
  }
  return promptData;
}

/**
 * Decide whether a training_now / training_at intent should appear in the
 * reconcile plan. Caller still owns legacy-key filtering.
 */
export function decideTrainingPromptPlan(
  d: TrainingPromptIntentFields,
  options?: { nowMs?: number; appTag?: string },
): TrainingPromptPlanDecision {
  const nowMs = options?.nowMs ?? Date.now();
  const appTag = options?.appTag ?? 'reclaim';
  const title = d.title ?? 'Training';
  const body = d.body ?? '';

  if (d.scheduledAt) {
    // Delivered timed prompts are hard-excluded (firedAt write-back on receive).
    if (d.firedAt) {
      return { action: 'skip', reason: 'timed_firedAt' };
    }
    // FGS rest-end timer: present immediately on the timed OS id (not now-slot).
    if (d.deliverNow === true) {
      return {
        action: 'immediate',
        identifier: `reclaim-training-at-${d.sessionId}`,
        title,
        body,
        data: { ...buildPromptData(d, appTag, true), deliverNow: true },
        trigger: null,
        channelId: 'training',
        categoryIdentifier: d.type,
      };
    }
    const fireAt = new Date(d.scheduledAt);
    const fireMs = fireAt.getTime();
    if (!Number.isFinite(fireMs)) {
      return { action: 'skip', reason: 'timed_invalid_scheduledAt' };
    }
    if (fireMs > nowMs) {
      return {
        action: 'timed',
        identifier: `reclaim-training-at-${d.sessionId}`,
        title,
        body,
        data: buildPromptData(d, appTag, true),
        fireAt,
        channelId: 'training',
        categoryIdentifier: d.type,
      };
    }
    // Past due, not yet marked fired — keep in plan during grace so reconcile
    // does not cancel the pending OS alarm (signature stays at:scheduledAt).
    const overdueMs = nowMs - fireMs;
    if (overdueMs <= TIMED_PROMPT_CANCEL_GRACE_MS) {
      return {
        action: 'timed',
        identifier: `reclaim-training-at-${d.sessionId}`,
        title,
        body,
        data: buildPromptData(d, appTag, true),
        fireAt,
        channelId: 'training',
        categoryIdentifier: d.type,
      };
    }
    return { action: 'skip', reason: 'timed_past_grace' };
  }

  // Immediate (training_now): firedAt guard — once presented, never re-materialized.
  if (d.firedAt) {
    return { action: 'skip', reason: 'immediate_firedAt' };
  }
  return {
    action: 'immediate',
    identifier: `reclaim-training-${d.sessionId}`,
    title,
    body,
    data: buildPromptData(d, appTag, false),
    trigger: null,
    channelId: 'training',
    categoryIdentifier: d.type,
  };
}

/**
 * Stable signature fragment for timed prompts — must depend on scheduledAt ISO,
 * not live seconds-until, so grace re-emits match existing OS rows.
 */
export function trainingTimedPlanSignatureParts(planned: {
  logicalKey: string;
  title: string;
  body: string;
  channelId?: string;
  categoryIdentifier?: string;
  identifier?: string;
  data?: { scheduledAt?: string };
}): string {
  const scheduledAt = planned.data?.scheduledAt;
  const triggerSig = scheduledAt ? `at:${scheduledAt}` : 'unknown';
  return [
    String(planned.logicalKey),
    planned.title,
    planned.body,
    triggerSig,
    planned.channelId ?? '',
    planned.categoryIdentifier ?? '',
    planned.identifier ?? '',
  ].join('|');
}
