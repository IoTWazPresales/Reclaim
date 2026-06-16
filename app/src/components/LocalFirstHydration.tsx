import React, { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/providers/AuthProvider';
import { initializeLocalDatabase } from '@/lib/localData';
import { primeLocalFirstReadCaches } from '@/lib/localData/localFirstCachePrime';
import { logger } from '@/lib/logger';

/**
 * Opens SQLite early and seeds sleep/integration queries from local snapshots.
 * Does not block navigation; failures are logged (explicit, not silent empty-state).
 */
export function LocalFirstHydration() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const uid = session?.user?.id;

  useEffect(() => {
    void initializeLocalDatabase().then((r) => {
      if (!r.ok) {
        logger.warn('[LocalFirstHydration] local DB init failed', r.error?.message);
      }
    });
  }, []);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    void (async () => {
      const r = await initializeLocalDatabase();
      if (!r.ok || cancelled) return;
      try {
        await primeLocalFirstReadCaches(qc, uid);
      } catch (e) {
        logger.warn('[LocalFirstHydration] prime failed', (e as Error)?.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, qc]);

  return null;
}
