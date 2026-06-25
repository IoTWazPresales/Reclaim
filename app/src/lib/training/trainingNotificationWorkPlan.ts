/**
 * Derive guided-training notification lookahead from persisted session items (DB SSOT).
 * Implementation lives in trainingSessionProgression.ts — this module re-exports for callers.
 */

export {
  buildNotificationWorkChain,
  listPendingWorkTargets,
  workTargetToNotificationNext,
  type NotificationWorkChain,
  type PendingWorkTarget,
} from '@/lib/training/trainingSessionProgression';
