import { formatDistanceToNow } from 'date-fns';

export type SyncDisplayPhase = 'never' | 'syncing' | 'synced';

export type SyncDisplaySnapshot = {
  phase: SyncDisplayPhase;
  /** Short label for greeting row — "never" only when no successful sync exists. */
  relativeLabel: string;
  /** Analytics / settings one-liner. */
  lastSuccessAt: string | null;
  isSyncing: boolean;
};

export function buildSyncDisplaySnapshot(opts: {
  lastSuccessAt: string | null;
  isSyncing: boolean;
  now?: Date;
}): SyncDisplaySnapshot {
  const { lastSuccessAt, isSyncing } = opts;

  if (isSyncing) {
    return {
      phase: 'syncing',
      relativeLabel: 'now',
      lastSuccessAt,
      isSyncing: true,
    };
  }

  if (!lastSuccessAt) {
    return {
      phase: 'never',
      relativeLabel: 'never',
      lastSuccessAt: null,
      isSyncing: false,
    };
  }

  const parsed = new Date(lastSuccessAt);
  const relativeLabel = Number.isFinite(parsed.getTime())
    ? formatDistanceToNow(parsed, { addSuffix: true })
    : 'recently';

  return {
    phase: 'synced',
    relativeLabel,
    lastSuccessAt,
    isSyncing: false,
  };
}

export async function fetchSyncDisplaySnapshot(isSyncing: boolean): Promise<SyncDisplaySnapshot> {
  const { getLastHealthSyncSuccessISO } = await import('@/lib/sync');
  const lastSuccessAt = await getLastHealthSyncSuccessISO();
  return buildSyncDisplaySnapshot({ lastSuccessAt, isSyncing });
}

export function formatSyncGreetingLine(snapshot: SyncDisplaySnapshot): string {
  if (snapshot.phase === 'syncing') return 'Syncing…';
  if (snapshot.phase === 'never') return 'Sync never';
  return `Sync ${snapshot.relativeLabel}`;
}

export function formatSyncAnalyticsLine(snapshot: SyncDisplaySnapshot): string {
  if (snapshot.phase === 'syncing') return 'Syncing…';
  if (snapshot.phase === 'never' || !snapshot.lastSuccessAt) return '—';
  const d = new Date(snapshot.lastSuccessAt);
  if (!Number.isFinite(d.getTime())) return '—';
  return `${d.toLocaleDateString()} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}
