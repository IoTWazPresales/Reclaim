/** Local durable database layer — operational metadata (not React Query cache). */

export type LocalDbInitStatus = 'uninitialized' | 'opening' | 'ready' | 'failed';

export type LocalDbInitResult =
  | { ok: true; status: 'ready' }
  | { ok: false; status: 'failed'; error: Error };

/** Sync ledger metadata rows (Phase 1 stub — domains extend in later phases). */
export type SyncDomainKey =
  | 'sleep'
  | 'health_daily'
  | 'mood'
  | 'meds'
  | 'meditation'
  | 'training'
  | 'routines'
  | 'recovery'
  | 'insights'
  | 'notifications';
