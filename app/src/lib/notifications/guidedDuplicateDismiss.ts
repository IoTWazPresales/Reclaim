/**
 * Duplicate-delivery + finally-dismiss policy for notification action responses.
 *
 * Guided prompts reuse one OS now-slot id per session (`reclaim-training-{sessionId}`).
 * Idempotency keys are salted with issuedAt, but dismiss uses that shared OS id.
 * After the first delivery posts a newer tile on the same id, a duplicate of the
 * *old* response must not dismiss — that would kill the fresh tile (Wear flash).
 *
 * The processNotificationResponse `finally` block has the same hazard on every
 * *successful* guided Done/Skip/Next: the handler has already posted the next
 * now-slot tile, so dismissing `identifier` again kills it. Guided types skip
 * finally-dismiss; the early first-tap dismiss + handler schedule/clear own
 * tile lifecycle.
 */
import { logger } from '@/lib/logger';

export function isGuidedTrainingPromptType(type: unknown): boolean {
  return type === 'TRAINING_SET' || type === 'TRAINING_REST';
}

export type DuplicateDismissOutcome = 'dismissed' | 'skipped_guided';

/**
 * When wasActionProcessed(key) is already true, decide whether to dismiss the
 * OS notification for this duplicate delivery.
 */
export async function applyDuplicateProcessedDismiss(params: {
  type: unknown;
  identifier: string;
  key: string;
  issuedAt?: string;
  dismissNotificationAsync: (identifier: string) => Promise<void>;
}): Promise<DuplicateDismissOutcome> {
  if (isGuidedTrainingPromptType(params.type)) {
    if (__DEV__) {
      logger.debug('[NOTIF_ACTION] guided duplicate dismiss suppressed', {
        key: params.key,
        identifier: params.identifier,
        issuedAt: params.issuedAt ?? null,
        type: params.type,
      });
    }
    return 'skipped_guided';
  }

  await params.dismissNotificationAsync(params.identifier);
  return 'dismissed';
}

/**
 * End-of-handler dismiss in processNotificationResponse `finally`.
 * Skip for TRAINING_SET / TRAINING_REST so the handler's newly posted now-slot
 * tile survives. Non-guided types still dismiss.
 */
export async function applyFinallyResponseDismiss(params: {
  type: unknown;
  identifier: string;
  key: string;
  dismissNotificationAsync: (identifier: string) => Promise<void>;
}): Promise<DuplicateDismissOutcome> {
  if (isGuidedTrainingPromptType(params.type)) {
    if (__DEV__) {
      logger.debug('[NOTIF_ACTION] guided finally dismiss suppressed', {
        key: params.key,
        identifier: params.identifier,
        type: params.type,
      });
    }
    return 'skipped_guided';
  }

  await params.dismissNotificationAsync(params.identifier);
  return 'dismissed';
}
