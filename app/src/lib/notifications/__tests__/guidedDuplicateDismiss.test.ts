/**
 * Duplicate-delivery + finally-dismiss policy for guided training prompts.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const loggerDebug = vi.hoisted(() => vi.fn());

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: (...args: unknown[]) => loggerDebug(...args),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  applyDuplicateProcessedDismiss,
  applyFinallyResponseDismiss,
  isGuidedTrainingPromptType,
} from '@/lib/notifications/guidedDuplicateDismiss';

describe('guidedDuplicateDismiss', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('treats TRAINING_SET and TRAINING_REST as guided prompt types', () => {
    expect(isGuidedTrainingPromptType('TRAINING_SET')).toBe(true);
    expect(isGuidedTrainingPromptType('TRAINING_REST')).toBe(true);
    expect(isGuidedTrainingPromptType('TRAINING_REMINDER')).toBe(false);
    expect(isGuidedTrainingPromptType('MED_REMINDER')).toBe(false);
  });

  it('does not call dismiss for duplicate TRAINING_SET delivery', async () => {
    const dismissNotificationAsync = vi.fn(async () => undefined);
    const outcome = await applyDuplicateProcessedDismiss({
      type: 'TRAINING_SET',
      identifier: 'reclaim-training-sess-1',
      key: 'reclaim-training-sess-1::SET_DONE::issued-1',
      issuedAt: 'issued-1',
      dismissNotificationAsync,
    });
    expect(outcome).toBe('skipped_guided');
    expect(dismissNotificationAsync).not.toHaveBeenCalled();
    if (__DEV__) {
      expect(loggerDebug).toHaveBeenCalledWith(
        '[NOTIF_ACTION] guided duplicate dismiss suppressed',
        expect.objectContaining({
          identifier: 'reclaim-training-sess-1',
          key: 'reclaim-training-sess-1::SET_DONE::issued-1',
          issuedAt: 'issued-1',
          type: 'TRAINING_SET',
        }),
      );
    }
  });

  it('does not call dismiss for duplicate TRAINING_REST delivery', async () => {
    const dismissNotificationAsync = vi.fn(async () => undefined);
    const outcome = await applyDuplicateProcessedDismiss({
      type: 'TRAINING_REST',
      identifier: 'reclaim-training-sess-1',
      key: 'reclaim-training-sess-1::NEXT_SET::issued-2',
      issuedAt: 'issued-2',
      dismissNotificationAsync,
    });
    expect(outcome).toBe('skipped_guided');
    expect(dismissNotificationAsync).not.toHaveBeenCalled();
  });

  it('still dismisses for non-training duplicate delivery', async () => {
    const dismissNotificationAsync = vi.fn(async () => undefined);
    const outcome = await applyDuplicateProcessedDismiss({
      type: 'MED_REMINDER',
      identifier: 'med-1',
      key: 'med-1::TAKE',
      dismissNotificationAsync,
    });
    expect(outcome).toBe('dismissed');
    expect(dismissNotificationAsync).toHaveBeenCalledWith('med-1');
  });
});

describe('applyFinallyResponseDismiss (U3.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not dismiss now-slot after successful SET_DONE (TRAINING_SET)', async () => {
    const dismissNotificationAsync = vi.fn(async () => undefined);
    const nowSlotId = 'reclaim-training-sess-1';
    const outcome = await applyFinallyResponseDismiss({
      type: 'TRAINING_SET',
      identifier: nowSlotId,
      key: `${nowSlotId}::SET_DONE::issued-1`,
      dismissNotificationAsync,
    });
    expect(outcome).toBe('skipped_guided');
    expect(dismissNotificationAsync).not.toHaveBeenCalled();
    if (__DEV__) {
      expect(loggerDebug).toHaveBeenCalledWith(
        '[NOTIF_ACTION] guided finally dismiss suppressed',
        expect.objectContaining({
          key: `${nowSlotId}::SET_DONE::issued-1`,
          identifier: nowSlotId,
          type: 'TRAINING_SET',
        }),
      );
    }
  });

  it('does not dismiss now-slot after successful NEXT_SET (TRAINING_REST)', async () => {
    const dismissNotificationAsync = vi.fn(async () => undefined);
    const nowSlotId = 'reclaim-training-sess-1';
    const outcome = await applyFinallyResponseDismiss({
      type: 'TRAINING_REST',
      identifier: nowSlotId,
      key: `${nowSlotId}::NEXT_SET::issued-2`,
      dismissNotificationAsync,
    });
    expect(outcome).toBe('skipped_guided');
    expect(dismissNotificationAsync).not.toHaveBeenCalled();
  });

  it('still dismisses in finally for non-guided actions', async () => {
    const dismissNotificationAsync = vi.fn(async () => undefined);
    const outcome = await applyFinallyResponseDismiss({
      type: 'MED_REMINDER',
      identifier: 'med-1',
      key: 'med-1::TAKE',
      dismissNotificationAsync,
    });
    expect(outcome).toBe('dismissed');
    expect(dismissNotificationAsync).toHaveBeenCalledWith('med-1');
  });

  it('still dismisses TRAINING_REMINDER in finally (not a shared now-slot prompt)', async () => {
    const dismissNotificationAsync = vi.fn(async () => undefined);
    const outcome = await applyFinallyResponseDismiss({
      type: 'TRAINING_REMINDER',
      identifier: 'training-reminder-1',
      key: 'training-reminder-1::DEFAULT',
      dismissNotificationAsync,
    });
    expect(outcome).toBe('dismissed');
    expect(dismissNotificationAsync).toHaveBeenCalledWith('training-reminder-1');
  });
});
