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
let release: (() => void) | undefined;
async function lease(userId: string) {
  release = (await import('../privacyOperation')).beginPrivacyOperation(userId);
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
beforeEach(() => {
  vi.resetModules();
  state.secure.clear(); state.fallback.clear(); state.failRemoval = false;
  vi.stubEnv('EXPO_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
  vi.stubEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY', 'test-key');
  // Fail any unexpected network call: local deletion must not require logout connectivity.
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
});
afterEach(async () => {
  release?.(); release = undefined;
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
  await lease('deleted-user');
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
  await lease('deleted-user');
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
  await lease('deleted-user');
  await mod.clearDeletedAccountSession('deleted-user');
  release!();
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(makeSession('next-user')), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  const result = await client.auth.signInWithPassword({ email: 'throwaway@example.invalid', password: 'test-only' });
  expect(result.error).toBeNull();
  expect((await client.auth.getSession()).data.session?.user.id).toBe('next-user');
});

it('refuses cleanup of a different persisted account without sign-out or key removal', async () => {
  state.secure.set(storageKey, JSON.stringify(makeSession('next-user')));
  const mod = await import('../supabase'); client = mod.supabase;
  await client.auth.getSession();
  await lease('deleted-user');
  const signOut = vi.spyOn(client.auth, 'signOut');
  await expect(mod.clearDeletedAccountSession('deleted-user')).rejects.toThrow('preserved');
  expect(signOut).not.toHaveBeenCalled();
  expect((await client.auth.getSession()).data.session?.user.id).toBe('next-user');
  expect(state.secure.has(storageKey)).toBe(true);
  expect(mod.isDeletedAccount('deleted-user')).toBe(true);
});

it('rejects real SDK foreign sign-in persistence while the privacy lease is active', async () => {
  state.secure.set(storageKey, JSON.stringify(makeSession('deleted-user')));
  const mod = await import('../supabase'); client = mod.supabase;
  await client.auth.getSession();
  await lease('deleted-user');
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(makeSession('next-user')), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  await expect(client.auth.signInWithPassword({ email: 'throwaway@example.invalid', password: 'test-only' })).rejects.toThrow('data request');
  expect((await client.auth.getSession()).data.session?.user.id).toBe('deleted-user');
  expect(state.fallback.size).toBe(0);
});

it('queues foreign sign-in behind pending credential removal, rejects it, and finishes local sign-out', async () => {
  state.secure.set(storageKey, JSON.stringify(makeSession('deleted-user')));
  const mod = await import('../supabase'); client = mod.supabase;
  await client.auth.getSession();
  await lease('deleted-user');
  const removal = deferred<void>();
  const entered = deferred<void>();
  const native = await import('expo-secure-store');
  vi.mocked(native.deleteItemAsync).mockImplementationOnce(async key => {
    entered.resolve(); await removal.promise; state.secure.delete(key);
  });
  const cleanup = mod.clearDeletedAccountSession('deleted-user');
  await entered.promise;
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(makeSession('next-user')), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  const login = expect(client.auth.signInWithPassword({ email: 'throwaway@example.invalid', password: 'test-only' })).rejects.toThrow('data request');
  removal.resolve();
  await login;
  await expect(cleanup).resolves.toEqual([]);
  expect((await client.auth.getSession()).data.session).toBeNull();
});

it('drains a foreign auth write begun before the lease and preserves it on stale cleanup', async () => {
  const mod = await import('../supabase'); client = mod.supabase;
  await client.auth.getSession();
  const write = deferred<void>();
  const entered = deferred<void>();
  const native = await import('expo-secure-store');
  vi.mocked(native.setItemAsync).mockImplementationOnce(async (key, value) => {
    entered.resolve(); await write.promise; state.secure.set(key, value);
  });
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(makeSession('next-user')), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  const login = client.auth.signInWithPassword({ email: 'throwaway@example.invalid', password: 'test-only' });
  await entered.promise;
  await lease('deleted-user');
  let drained = false;
  const drain = mod.flushAuthStorageMutations().then(() => { drained = true; });
  await Promise.resolve();
  expect(drained).toBe(false);
  write.resolve();
  await login; await drain;
  await expect(mod.clearDeletedAccountSession('deleted-user')).rejects.toThrow('preserved');
  expect((await client.auth.getSession()).data.session?.user.id).toBe('next-user');
});

it('real functions SDK honors an explicit captured token over its current session', async () => {
  state.secure.set(storageKey, JSON.stringify(makeSession('next-user')));
  const mod = await import('../supabase'); client = mod.supabase;
  await client.auth.getSession();
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ ok: true, userId: 'deleted-user' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  const token = makeSession('deleted-user').access_token;
  await client.functions.invoke('delete-account', { body: {}, headers: { Authorization: `Bearer ${token}` } });
  const request = vi.mocked(fetch).mock.calls[0][1]!;
  expect(new Headers(request.headers).get('Authorization')).toBe(`Bearer ${token}`);
});
