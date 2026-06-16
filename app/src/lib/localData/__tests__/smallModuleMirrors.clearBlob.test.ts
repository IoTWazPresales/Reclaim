import { beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
  mockDb: {
    runAsync: vi.fn(async () => {}),
  },
}));

vi.mock('@/lib/localData/database', () => ({
  initializeLocalDatabase: vi.fn(async () => ({ ok: true, status: 'ready' as const })),
  requireLocalDatabase: () => hoisted.mockDb,
}));

import { clearBlobMirrorForDomain } from '../smallModuleMirrors';

describe('smallModuleMirrors clearBlobMirrorForDomain', () => {
  beforeEach(() => {
    hoisted.mockDb.runAsync.mockClear();
  });

  it('deletes row for domain + user', async () => {
    await clearBlobMirrorForDomain('guided_active_session', 'user-1');
    expect(hoisted.mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM reclaim_async_blob_mirror'),
      ['guided_active_session', 'user-1'],
    );
  });

  it('no-ops empty user id', async () => {
    await clearBlobMirrorForDomain('guided_active_session', '');
    expect(hoisted.mockDb.runAsync).not.toHaveBeenCalled();
  });
});
