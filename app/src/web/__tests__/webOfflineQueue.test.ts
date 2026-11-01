import { describe, expect, it } from 'vitest';
import { enqueueOperation, loadOfflineQueue, saveOfflineQueue } from '@/lib/training/offlineQueue.web';

describe('online-only web capability', () => {
  it('rejects an unsaved canonical write rather than silently queuing it', async () => {
    await expect(enqueueOperation({ type: 'insertSetLog' } as never)).rejects.toThrow('Not saved.');
    expect(await loadOfflineQueue({ strict: true })).toEqual([]);
  });
  it('refuses replay data while allowing an empty queue clear', async () => {
    await expect(saveOfflineQueue([{ type: 'insertSetLog' } as never])).rejects.toThrow('requires a connection');
    await expect(saveOfflineQueue([])).resolves.toBeUndefined();
  });
});
