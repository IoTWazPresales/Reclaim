/**
 * DEV-only structured traces for guided training transitions (UI, notifications, replay).
 * Enables device debugging without spamming production — all emits guarded by __DEV__.
 */

import { logger } from '@/lib/logger';

const TAG = '[GUIDED_TRACE]';

/** How the notification pipeline delivered the action (watch often uses background_task). */
export type GuidedTraceDelivery =
  | 'background_task'
  | 'notification_listener'
  | 'cold_start_replay'
  | 'foreground_replay_drain';

/** Semantic source for transition trace rows. */
export type GuidedTraceSource =
  | 'ui'
  | 'phone_notification'
  | 'watch_notification'
  | 'foreground_replay'
  | 'snapshot_restore';

export type GuidedTraceAction =
  | 'SET_DONE'
  | 'NEXT_SET'
  | 'REST_START'
  | 'REST_COMPLETE'
  | 'RESTORE'
  | 'SCHEDULE_NOTIFICATION'
  | 'CLEAR_NOTIFICATION'
  | 'OVERLAY_OPEN'
  | 'OVERLAY_SUPPRESS'
  | 'SNAPSHOT_WRITE'
  | 'QUERY_INVALIDATION'
  | 'EXTERNAL_REST_APPLY'
  | 'EXTERNAL_REST_REJECT';

export type GuidedTracePayload = {
  ts: string;
  source: GuidedTraceSource;
  action: GuidedTraceAction;
  delivery?: GuidedTraceDelivery;
  sessionId?: string;
  sessionItemId?: string;
  exerciseId?: string;
  setIndex?: number;
  previousCurrentSetIndex?: number | null;
  nextCurrentSetIndex?: number | null;
  restSeconds?: number | null;
  snapshotCurrentSetIndexBefore?: number | null;
  snapshotCurrentSetIndexAfter?: number | null;
  acceptanceReason?: string;
  rejectionReason?: string;
  intentKeysCleared?: string[];
  intentKeysScheduled?: string[];
  writeOnline?: boolean;
  queryInvalidation?: boolean;
  overlayOpened?: boolean;
  overlaySuppressReason?: string;
  note?: string;
};

function inferSource(delivery: GuidedTraceDelivery | undefined, explicit?: GuidedTraceSource): GuidedTraceSource {
  if (explicit) return explicit;
  if (!delivery) return 'phone_notification';
  if (delivery === 'foreground_replay_drain' || delivery === 'cold_start_replay') return 'foreground_replay';
  if (delivery === 'background_task') return 'watch_notification';
  return 'phone_notification';
}

export type GuidedTraceInput = Omit<GuidedTracePayload, 'ts' | 'source'> & {
  source?: GuidedTraceSource;
  delivery?: GuidedTraceDelivery;
};

/** Emit one structured trace object (DEV only). */
export function traceGuidedTransition(
  partial: GuidedTraceInput,
): void {
  if (!__DEV__) return;
  const row: GuidedTracePayload = {
    ts: new Date().toISOString(),
    ...partial,
    source: inferSource(partial.delivery, partial.source),
  };
  logger.debug(TAG, row);
}
