import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { startupRouteTarget } from '@/startup/startupRouteTarget';

const state = vi.hoisted(() => ({ secure: new Map<string, string>(), fallback: new Map<string, string>(), failRemoval: false }));
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(async (key: string) => state.secure.get(key) ?? null),
  setItemAsync: vi.fn(async (key: string, value: string) => { state.secure.set(key, value); }),
  deleteItemAsync: vi.fn(async (key: string) => {
    if (state.failRemoval) throw new Error('device storage failed');
    state.secure.delete(key);
  }),
}));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: {
  getItem: vi.fn(async (key: string) => state.fallback.get(key) ?? null),
  setItem: vi.fn(async (key: string, value: string) => { state.fallback.set(key, value); }),
  removeItem: vi.fn(async (key: string) => {
    if (state.failRemoval) throw new Error('device storage failed');
    state.fallback.delete(key);
  }),
} }));

const storageKey = 'sb-test-auth-token';
const makeSession = (id: string) => ({
  access_token: `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: id, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.signature`,
  refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: { id, aud: 'authenticated', email: 'throwaway@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-09-20T00:00:00Z' },
});
let client: (typeof import('../supabase'))['supabase'] | undefined;
beforeEach(() => {
  vi.resetModules();
  state.secure.clear(); state.fallback.clear(); state.failRemoval = false;
  vi.stubEnv('EXPO_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
  vi.stubEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY', 'test-key');
  // Fail any unexpected network call: local deletion must not require logout connectivity.
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
});
afterEach(async () => {
  await client?.auth.stopAutoRefresh();
  vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks();
});

it.each(['secure', 'fallback'] as const)('real SDK signs out from %s storage and routes Auth without a logout network request', async store => {
  const key = store === 'secure' ? storageKey : `@reclaim/supabase/fallback/${storageKey}`;
  state[store].set(key, JSON.stringify(makeSession('deleted-user')));
  const mod = await import('../supabase'); client = mod.supabase;
  expect((await client.auth.getSession()).data.session?.user.id).toBe('deleted-user');
  const events: string[] = [];
  const { data } = client.auth.onAuthStateChange((event) => { events.push(event); });
  expect(await mod.clearDeletedAccountSession('deleted-user')).toEqual([]);
  const session = (await client.auth.getSession()).data.session;
  expect(session).toBeNull();
  expect(events).toContain('SIGNED_OUT');
  expect(startupRouteTarget(!!session, 'no')).toBe('auth');
  expect(fetch).not.toHaveBeenCalled();
  expect(state[store].has(key)).toBe(false);
  data.subscription.unsubscribe();
});

it('storage failure still rejects the deleted identity and emits SIGNED_OUT, with an explicit cleanup warning', async () => {
  state.secure.set(storageKey, JSON.stringify(makeSession('deleted-user')));
  const mod = await import('../supabase'); client = mod.supabase;
  await client.auth.getSession();
  state.failRemoval = true;
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const events: string[] = [];
  const { data } = client.auth.onAuthStateChange(event => { events.push(event); });
  expect(await mod.clearDeletedAccountSession('deleted-user')).toEqual(['Saved sign-in details']);
  expect((await client.auth.getSession()).data.session).toBeNull();
  expect(events).toContain('SIGNED_OUT');
  expect(mod.isDeletedAccount('deleted-user')).toBe(true);
  expect(mod.isDeletedAccount('next-user')).toBe(false);
  expect(fetch).not.toHaveBeenCalled();
  data.subscription.unsubscribe();
});

it('a different account can sign in after deletion; the tombstone is identity-scoped', async () => {
  const mod = await import('../supabase'); client = mod.supabase;
  await client.auth.getSession();
  await mod.clearDeletedAccountSession('deleted-user');
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(makeSession('next-user')), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  const result = await client.auth.signInWithPassword({ email: 'throwaway@example.invalid', password: 'test-only' });
  expect(result.error).toBeNull();
  expect((await client.auth.getSession()).data.session?.user.id).toBe('next-user');
});
