import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PERSONAL_DATA_USER_ID_DELETE_TABLES } from '../personalDataTables';

const m = vi.hoisted(() => ({
  user: vi.fn(), invoke: vi.fn(), from: vi.fn(), eq: vi.fn(), signOut: vi.fn(),
  forget: vi.fn(), local: vi.fn(), intents: vi.fn(), reconcile: vi.fn(),
  onboarding: vi.fn(), provider: vi.fn(), keys: vi.fn(), remove: vi.fn(), cancel: vi.fn(), clear: vi.fn(),
}));
vi.mock('@/lib/supabase', () => ({ supabase: {
  auth: { getUser: m.user, signOut: m.signOut }, functions: { invoke: m.invoke }, from: m.from,
}, clearDeletedAccountSession: m.forget }));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: { getAllKeys: m.keys, multiRemove: m.remove } }));
vi.mock('expo-file-system', () => ({}));
vi.mock('expo-print', () => ({}));
vi.mock('expo-sharing', () => ({}));
vi.mock('@/lib/localData/localDataPrivacy', () => ({ clearAllLocalDataForUser: m.local, exportLocalDataSectionForUser: vi.fn() }));
vi.mock('@/lib/localData/meditationSessionsRepository', () => ({ MEDITATION_LEGACY_ASYNC_STORAGE_KEY: 'meditation' }));
vi.mock('@/lib/localData/recoveryProgressRepository', () => ({ RECOVERY_PROGRESS_LEGACY_STORAGE_KEY: 'recovery' }));
vi.mock('@/lib/mood/moodOutbox', () => ({ MOOD_LEGACY_IMPORT_STATE_KEY_V2: 'import', MOOD_LEGACY_KEY_V1: 'mood', MOOD_PENDING_KEY_V2: 'pending' }));
vi.mock('@/lib/routines', () => ({ ROUTINE_DAY_LEGACY_STORAGE_PREFIX: 'routine:', ROUTINE_INTENT_KEY: 'intent' }));
vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn(), debug: vi.fn() } }));
vi.mock('@/lib/notifications/NotificationIntentStore', () => ({ clearAllIntents: m.intents }));
vi.mock('@/lib/notifications/NotificationScheduler', () => ({ reconcileNotifications: m.reconcile }));
vi.mock('@/lib/queryClient', () => ({ queryClient: { cancelQueries: m.cancel, clear: m.clear } }));
vi.mock('@/state/onboarding', () => ({ setHasOnboarded: m.onboarding }));
vi.mock('@/state/providerPreferences', () => ({ resetProviderOnboardingComplete: m.provider }));
import { deleteAllPersonalData, deleteClientDeletableDataKeepingAccount } from '../dataPrivacy';
import { ACCOUNT_DELETION_COPY, accountDeletionOutcome } from '../accountDeletionCopy';

beforeEach(() => {
  vi.resetAllMocks();
  m.user.mockResolvedValue({ data: { user: { id: 'user-a' } }, error: null });
  m.invoke.mockResolvedValue({ data: { ok: true }, error: null });
  m.forget.mockResolvedValue([]);
  m.local.mockResolvedValue({ ok: true });
  m.keys.mockResolvedValue(['@reclaim/supabase/fallback/auth', 'routine:today', 'unrelated']);
  m.eq.mockResolvedValue({ error: null });
  m.from.mockImplementation(() => ({ delete: () => ({ eq: m.eq }) }));
});

describe('account deletion orchestration', () => {
  it('requires server success, signs out before onboarding reset and clears both caches', async () => {
    expect(await deleteAllPersonalData()).toEqual({ cleanupWarnings: [] });
    expect(m.invoke).toHaveBeenCalledWith('delete-account', { body: {} });
    expect(m.from).not.toHaveBeenCalled();
    expect(m.forget).toHaveBeenCalledWith('user-a');
    expect(m.forget.mock.invocationCallOrder[0]).toBeLessThan(m.onboarding.mock.invocationCallOrder[0]);
    expect(m.cancel).toHaveBeenCalledOnce();
    expect(m.clear).toHaveBeenCalledTimes(2);
    expect(m.local).toHaveBeenCalledWith('user-a');
    expect(m.remove).toHaveBeenCalled();
  });

  it.each([404, 500])('never falls back or resets local state when server returns %s', async status => {
    const error = { message: 'function not found', context: { status } };
    m.invoke.mockResolvedValue({ error });
    await expect(deleteAllPersonalData()).rejects.toEqual(error);
    for (const mock of [m.from, m.forget, m.local, m.intents, m.onboarding, m.clear]) expect(mock).not.toHaveBeenCalled();
  });

  it.each([null, {}, { ok: false }, { success: true }])('rejects unconfirmed success %j', async data => {
    m.invoke.mockResolvedValue({ data, error: null });
    await expect(deleteAllPersonalData()).rejects.toThrow('did not confirm');
    expect(m.forget).not.toHaveBeenCalled();
  });

  it('coalesces simultaneous confirmations into one deletion', async () => {
    const first = deleteAllPersonalData();
    const second = deleteAllPersonalData();
    expect(second).toBe(first);
    await first;
    expect(m.invoke).toHaveBeenCalledOnce();
  });

  it('attempts every cleanup after failures and does not misreport server deletion as failed', async () => {
    m.forget.mockResolvedValue(['Saved sign-in details']);
    m.cancel.mockRejectedValue(new Error('cancel'));
    m.intents.mockRejectedValue(new Error('intents'));
    m.onboarding.mockRejectedValue(new Error('onboarding'));
    m.local.mockResolvedValue({ ok: false, error: 'disk' });
    m.remove.mockRejectedValue(new Error('storage'));
    const result = await deleteAllPersonalData();
    expect(result.cleanupWarnings).toEqual(['Saved sign-in details', 'Pending queries', 'Notification intents', 'Onboarding cache', 'On-device records', 'Local caches']);
    expect(m.reconcile).toHaveBeenCalledOnce();
    expect(m.provider).toHaveBeenCalledOnce();
    expect(m.clear).toHaveBeenCalledTimes(2);
    expect(accountDeletionOutcome(result).message).toContain('Do not retry account deletion');
  });

  it('continues cleanup if sign-out itself rejects', async () => {
    m.forget.mockRejectedValue(new Error('auth storage unavailable'));
    expect((await deleteAllPersonalData()).cleanupWarnings).toContain('Sign-in session');
    expect(m.local).toHaveBeenCalled();
    expect(m.remove).toHaveBeenCalled();
  });
});

describe('explicit limited data reset keeps account', () => {
  it('only deletes client-eligible tables and preserves auth and onboarding', async () => {
    const result = await deleteClientDeletableDataKeepingAccount();
    expect(m.from.mock.calls.map(([table]) => table)).toEqual([...PERSONAL_DATA_USER_ID_DELETE_TABLES]);
    expect(m.eq.mock.calls.every(([column, id]) => column === 'user_id' && id === 'user-a')).toBe(true);
    for (const mock of [m.invoke, m.forget, m.signOut, m.onboarding, m.provider]) expect(mock).not.toHaveBeenCalled();
    expect(m.remove.mock.calls[0][0]).not.toContain('@reclaim/supabase/fallback/auth');
    expect(result.retainedTables).toEqual(expect.arrayContaining(['profiles', 'routine_templates', 'training_events']));
  });

  it('does not silently skip a missing column/table or invoke account deletion', async () => {
    m.eq.mockResolvedValue({ error: { code: '42703', message: 'column does not exist' } });
    await expect(deleteClientDeletableDataKeepingAccount()).rejects.toMatchObject({ code: '42703' });
    expect(m.invoke).not.toHaveBeenCalled();
    expect(m.forget).not.toHaveBeenCalled();
  });
});

it('both screens clearly confirm account deletion, not a data-only reset', () => {
  expect(ACCOUNT_DELETION_COPY.confirm).toBe('Delete account');
  expect(ACCOUNT_DELETION_COPY.description).toContain('cannot be undone');
  for (const screen of ['SettingsScreen.tsx', 'DataPrivacyScreen.tsx']) {
    const source = fs.readFileSync(path.resolve(__dirname, '../../screens', screen), 'utf8');
    expect(source).toContain('ACCOUNT_DELETION_COPY.description');
    expect(source).toContain('accountDeletionOutcome(await deleteAllPersonalData())');
    expect(source).not.toMatch(/Delete (my data|all personal data)|Sign (back )?in again to start fresh/);
  }
});
