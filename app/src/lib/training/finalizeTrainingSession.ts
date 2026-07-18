/**
 * Canonical session end — delegates to closeTrainingSession (durable ended_at first).
 */
export {
  closeTrainingSession,
  finalizeTrainingSessionAndCleanup,
  hasPendingClose,
  isSessionWorkComplete,
  markSessionPendingClose,
  clearSessionPendingClose,
  enrichClosedSessionInBackground,
  CLOSE_PHASE1_TIMEOUT_MS,
  type CloseTrainingSessionInput,
  type CloseTrainingSessionInput as FinalizeTrainingSessionInput,
  type CloseTrainingSessionResult,
  type CloseTrainingSessionResult as FinalizeTrainingSessionResult,
} from '@/lib/training/closeTrainingSession';

import {
  closeTrainingSession,
  type CloseTrainingSessionInput,
  type CloseTrainingSessionResult,
} from '@/lib/training/closeTrainingSession';
import { clearTrainingIntentsForSession } from '@/lib/notifications/trainingNotificationScheduler';
import { reconcileNotifications } from '@/lib/notifications/NotificationScheduler';

/** @deprecated Prefer closeTrainingSession — same durable close path. */
export async function finalizeTrainingSession(
  input: CloseTrainingSessionInput,
): Promise<CloseTrainingSessionResult> {
  return closeTrainingSession(input);
}

/** Clear guided-training notification intents for a session. */
export async function clearTrainingSessionNotificationIntents(sessionId: string): Promise<void> {
  await clearTrainingIntentsForSession(sessionId);
  await reconcileNotifications();
}
