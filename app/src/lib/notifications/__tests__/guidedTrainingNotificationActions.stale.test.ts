/**
 * Scaffold — stale notification payload rejection (PR-G).
 * SET_DONE / SKIP_SET must not double-log or move backward when DB already has the set.
 */
import { describe, it } from 'vitest';

describe.todo('guidedTrainingNotificationActions stale payload rejection (PR-G)');

describe('guidedTrainingNotificationActions stale payload — scaffold', () => {
  it.todo('SET_DONE skips when isSetAlreadyPerformedOnItem returns true');
  it.todo('SET_DONE does not call applySetCompletion when stale');
  it.todo('SKIP_SET skips when set already performed');
});
