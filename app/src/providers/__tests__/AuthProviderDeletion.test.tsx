import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  getSession: vi.fn(), refresh: vi.fn(), ensure: vi.fn(), deleted: new Set<string>(),
  callback: undefined as undefined | ((event: string, session: any) => Promise<void>),
}));
vi.mock('react-native', () => ({ AppState: { addEventListener: () => ({ remove: vi.fn() }) } }));
vi.mock('@/lib/supabase', () => ({
  isDeletedAccount: (id: string) => m.deleted.has(id),
  supabase: { auth: { onAuthStateChange: (fn: typeof m.callback) => {
    m.callback = fn; return { data: { subscription: { unsubscribe: vi.fn() } } };
  } } },
}));
vi.mock('@/lib/authSessionService', () => ({ getSession: m.getSession, refreshIfNeeded: m.refresh }));
vi.mock('@/lib/api', () => ({ ensureProfile: m.ensure }));
vi.mock('@/lib/logger', () => ({ logger: { debug: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
import { AuthProvider, useAuth } from '../AuthProvider';

let renderer: ReactTestRenderer;
let current: ReturnType<typeof useAuth>;
const oldSession = { user: { id: 'deleted-user' } };
function Probe() { current = useAuth(); return null; }
beforeEach(() => {
  vi.clearAllMocks(); m.deleted.clear();
  m.refresh.mockResolvedValue(undefined); m.ensure.mockResolvedValue(undefined);
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(async () => { await act(async () => renderer?.unmount()); });
async function mount() {
  await act(async () => { renderer = create(<AuthProvider><Probe /></AuthProvider>); });
}

it('a late bootstrap result cannot resurrect the session after SIGNED_OUT', async () => {
  let resolve!: (session: any) => void;
  m.getSession.mockReturnValue(new Promise(done => { resolve = done; }));
  await mount();
  await act(async () => { await m.callback!('SIGNED_OUT', null); });
  await act(async () => { resolve(oldSession); });
  expect(current.session).toBeNull();
  expect(current.loading).toBe(false);
  expect(m.ensure).not.toHaveBeenCalled();
});

it('late refresh events cannot resurrect a server-deleted user', async () => {
  m.getSession.mockResolvedValue(oldSession);
  await mount();
  m.deleted.add('deleted-user');
  m.ensure.mockClear();
  await act(async () => { await m.callback!('TOKEN_REFRESHED', oldSession); });
  expect(current.session).toBeNull();
  expect(m.ensure).not.toHaveBeenCalled();
});

it('an older bootstrap failure cannot overwrite a newer successful login', async () => {
  let reject!: (error: Error) => void;
  m.getSession.mockReturnValue(new Promise((_resolve, fail) => { reject = fail; }));
  await mount();
  const next = { user: { id: 'next-user' } };
  await act(async () => { await m.callback!('SIGNED_IN', next); });
  await act(async () => { reject(new Error('old request failed')); });
  expect(current.session?.user.id).toBe('next-user');
});
