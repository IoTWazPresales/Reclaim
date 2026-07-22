/**
 * Intent key scheme for training prompts (dumb-trigger pipeline).
 *
 * Intent slots:
 * - `training_now:{sessionId}` — immediate prompt
 * - `training_at:{sessionId}`  — absolute-timestamp prompt
 *
 * OS identifiers are separate so arming rest-end cannot cancel the live rest tile.
 */
import { describe, it, expect } from 'vitest';
import {
  trainingNowIntentKey,
  trainingTimedIntentKey,
  trainingNotificationIdentifier,
  trainingNowNotificationIdentifier,
  trainingTimedNotificationIdentifier,
} from '@/lib/notifications/trainingNotificationKeys';

describe('training notification intent key scheme', () => {
  const sessionId = 'sess-123';

  it('uses exactly one immediate slot per session', () => {
    expect(trainingNowIntentKey(sessionId)).toBe('training_now:sess-123');
  });

  it('uses exactly one timed slot per session', () => {
    expect(trainingTimedIntentKey(sessionId)).toBe('training_at:sess-123');
  });

  it('maps now and at slots to separate OS notification identifiers', () => {
    expect(trainingNowNotificationIdentifier(sessionId)).toBe('reclaim-training-sess-123');
    expect(trainingNotificationIdentifier(sessionId)).toBe('reclaim-training-sess-123');
    expect(trainingTimedNotificationIdentifier(sessionId)).toBe('reclaim-training-at-sess-123');
    expect(trainingNowNotificationIdentifier(sessionId)).not.toBe(
      trainingTimedNotificationIdentifier(sessionId),
    );
  });

  it('keys carry no exercise or set identity (payloads cannot go stale by key)', () => {
    expect(trainingNowIntentKey(sessionId)).not.toMatch(/bench|:\d+$/);
    expect(trainingTimedIntentKey(sessionId)).not.toMatch(/bench|:\d+$/);
  });
});
