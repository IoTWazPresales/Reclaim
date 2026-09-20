import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import snapshot from '../../../../docs/schema/user_keyed_tables.json';
import { deletionVerificationTargets, verifyDeletedAccount } from '../../../scripts/lib/accountDeletionVerification';

const userId = '11111111-1111-4111-8111-111111111111';
function client() {
  const eq = vi.fn(async () => ({ count: 0 as number | null, error: null as { code: string } | null }));
  const getUserById = vi.fn(async () => ({ data: { user: null as { id: string } | null }, error: { status: 404, code: 'user_not_found' } as { status: number; code: string } | null }));
  const admin = { from: vi.fn(() => ({ select: vi.fn(() => ({ eq })) })), auth: { admin: { getUserById } } };
  return { admin: admin as unknown as SupabaseClient, eq, getUserById };
}
const target = [{ table: 'mood_checkins', column: 'user_id', optional: false }];

describe('post-deletion proof', () => {
  it('includes every snapshot key and makes present optional tables mandatory', () => {
    const targets = deletionVerificationTargets(snapshot);
    for (const table of snapshot.tables) {
      for (const column of table.user_columns) expect(targets).toContainEqual({ table: table.name, column, optional: false });
    }
    expect(targets).toContainEqual({ table: 'run_routes', column: 'user_id', optional: true });
    expect(targets).toContainEqual({ table: 'vitals_daily', column: 'user_id', optional: false });
  });
  it('succeeds only with zero exact counts and confirmed auth absence', async () => {
    const fake = client();
    await expect(verifyDeletedAccount(fake.admin, userId, target)).resolves.toEqual({ checked: ['mood_checkins.user_id'], skipped: [] });
    expect(fake.eq).toHaveBeenCalledWith('user_id', userId);
    expect(fake.getUserById).toHaveBeenCalledWith(userId);
  });
  it.each([1, null])('rejects nonzero or unknown count %s', async (count) => {
    const fake = client();
    fake.eq.mockResolvedValue({ count, error: null });
    await expect(verifyDeletedAccount(fake.admin, userId, target)).rejects.toThrow('Deletion not verified');
  });
  it('rejects a missing snapshot table and ambiguous auth failure', async () => {
    const fake = client();
    fake.eq.mockResolvedValue({ count: null, error: { code: '42P01' } });
    fake.getUserById.mockResolvedValue({ data: { user: null }, error: { status: 403, code: 'forbidden' } });
    await expect(verifyDeletedAccount(fake.admin, userId, target)).rejects.toThrow(/query failed[\s\S]*absence not proven/);
  });
  it('allows only explicitly optional missing tables', async () => {
    const fake = client();
    fake.eq.mockResolvedValue({ count: null, error: { code: 'PGRST205' } });
    await expect(verifyDeletedAccount(fake.admin, userId, [{ table: 'run_routes', column: 'user_id', optional: true }])).resolves.toEqual({ checked: [], skipped: ['run_routes.user_id'] });
  });
  it('rejects a surviving auth user even when all domain data is gone', async () => {
    const fake = client();
    fake.getUserById.mockResolvedValue({ data: { user: { id: userId } }, error: null });
    await expect(verifyDeletedAccount(fake.admin, userId, target)).rejects.toThrow('user still exists');
  });
  it('does not interpret null user without a not-found error as proof', async () => {
    const fake = client();
    fake.getUserById.mockResolvedValue({ data: { user: null }, error: null });
    await expect(verifyDeletedAccount(fake.admin, userId, target)).rejects.toThrow('absence not proven');
  });
  it('rejects empty inventory and malformed user IDs before querying', async () => {
    const fake = client();
    expect(() => deletionVerificationTargets({ tables: [] })).toThrow('Empty');
    await expect(verifyDeletedAccount(fake.admin, 'invalid', target)).rejects.toThrow('UUID');
    await expect(verifyDeletedAccount(fake.admin, userId, [])).rejects.toThrow('No tables');
    expect(fake.eq).not.toHaveBeenCalled();
  });
});
