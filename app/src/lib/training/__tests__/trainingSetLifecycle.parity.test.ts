/**
 * Scaffold — in-app vs notification lifecycle parity (PR-G).
 * Same DB state must produce same work chain and schedule decisions.
 */
import { describe, it } from 'vitest';

describe.todo('training set lifecycle parity — in-app vs notification (PR-G)');

describe('trainingSetLifecycle parity — scaffold', () => {
  it.todo('handleSetComplete and SET_DONE produce identical buildNotificationWorkChain after same DB state');
  it.todo('handleSetSkip and SKIP_SET produce identical pending work targets');
  it.todo('NEXT_SET after rest matches chain.next from DB reload');
});
