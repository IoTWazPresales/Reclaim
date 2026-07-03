/**
 * Intent key scheme for training prompts (dumb-trigger pipeline).
 *
 * One notification identity per session, updated in place:
 * - `training_now:{sessionId}` — the immediate prompt slot
 * - `training_at:{sessionId}`  — the absolute-timestamp prompt slot
 * Both map to OS identifier `reclaim-training-{sessionId}`.
 *
 * There are deliberately NO per-set intent keys anymore: successive sets
 * overwrite the same slot, so a "stale set key" mismatch (the old D7 bug
 * class) is structurally impossible.
 */
import { describe, it, expect } from 'vitest';
import {
  trainingNowIntentKey,
  trainingTimedIntentKey,
  trainingNotificationIdentifier,
} from '@/lib/notifications/trainingNotificationKeys';

describe('training notification intent key scheme', () => {
  const sessionId = 'sess-123';

  it('uses exactly one immediate slot per session', () => {
    expect(trainingNowIntentKey(sessionId)).toBe('training_now:sess-123');
  });

  it('uses exactly one timed slot per session', () => {
    expect(trainingTimedIntentKey(sessionId)).toBe('training_at:sess-123');
  });

  it('maps both slots to one OS notification identifier per session', () => {
    expect(trainingNotificationIdentifier(sessionId)).toBe('reclaim-training-sess-123');
  });

  it('keys carry no exercise or set identity (payloads cannot go stale by key)', () => {
    expect(trainingNowIntentKey(sessionId)).not.toMatch(/bench|:\d+$/);
    expect(trainingTimedIntentKey(sessionId)).not.toMatch(/bench|:\d+$/);
  });
});
