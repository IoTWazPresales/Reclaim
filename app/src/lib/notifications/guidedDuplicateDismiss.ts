/**
 * Duplicate-delivery dismiss policy for notification action responses.
 *
 * Guided prompts reuse one OS now-slot id per session (`reclaim-training-{sessionId}`).
 * Idempotency keys are salted with issuedAt, but dismiss uses that shared OS id.
 * After the first delivery posts a newer tile on the same id, a duplicate of the
 * *old* response must not dismiss — that would kill the fresh tile (Wear flash).
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
