import { describe, it, expect } from 'vitest';
import { buildSyncDisplaySnapshot, formatSyncGreetingLine } from '@/lib/sync/syncDisplay';

describe('syncDisplay', () => {
  it('shows never only when no successful sync', () => {
    const snap = buildSyncDisplaySnapshot({ lastSuccessAt: null, isSyncing: false });
    expect(snap.phase).toBe('never');
    expect(formatSyncGreetingLine(snap)).toBe('Connect sleep & health data');
  });

  it('shows syncing while in flight', () => {
    const snap = buildSyncDisplaySnapshot({ lastSuccessAt: null, isSyncing: true });
    expect(snap.phase).toBe('syncing');
    expect(formatSyncGreetingLine(snap)).toBe('Syncing…');
  });

  it('shows relative time after success', () => {
    const iso = new Date(Date.now() - 60_000).toISOString();
    const snap = buildSyncDisplaySnapshot({ lastSuccessAt: iso, isSyncing: false });
    expect(snap.phase).toBe('synced');
    expect(formatSyncGreetingLine(snap)).toMatch(/^Sync /);
    expect(formatSyncGreetingLine(snap)).not.toBe('Connect sleep & health data');
  });
});
