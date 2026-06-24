import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  buildSyncDisplaySnapshot,
  fetchSyncDisplaySnapshot,
  type SyncDisplaySnapshot,
} from '@/lib/sync/syncDisplay';
import { isHealthSyncInFlight, subscribeHealthSyncInFlight } from '@/sync/SyncCoordinator';

export const SYNC_DISPLAY_QUERY_KEY = ['sync:display'] as const;

export function useSyncDisplay(): SyncDisplaySnapshot & { refresh: () => void } {
  const qc = useQueryClient();
  const [inFlight, setInFlight] = useState(() => isHealthSyncInFlight());

  useEffect(() => {
    return subscribeHealthSyncInFlight(setInFlight);
  }, []);

  const q = useQuery({
    queryKey: [...SYNC_DISPLAY_QUERY_KEY],
    queryFn: () => fetchSyncDisplaySnapshot(isHealthSyncInFlight()),
    refetchInterval: inFlight ? 2_000 : 30_000,
    staleTime: 5_000,
  });

  const snapshot =
    q.data ??
    buildSyncDisplaySnapshot({
      lastSuccessAt: null,
      isSyncing: inFlight,
    });

  const merged = buildSyncDisplaySnapshot({
    lastSuccessAt: snapshot.lastSuccessAt,
    isSyncing: inFlight || snapshot.isSyncing,
  });

  const refresh = useCallback(() => {
    void qc.invalidateQueries({ queryKey: [...SYNC_DISPLAY_QUERY_KEY] });
  }, [qc]);

  return { ...merged, refresh };
}

export function invalidateSyncDisplay(qc: ReturnType<typeof useQueryClient>): void {
  void qc.invalidateQueries({ queryKey: [...SYNC_DISPLAY_QUERY_KEY] });
}
