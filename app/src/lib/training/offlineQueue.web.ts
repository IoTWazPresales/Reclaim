import type { OfflineOperation } from './offlineQueueSchema';
export type { OfflineOperation } from './offlineQueueSchema';
export { isValidOfflineQueuePayload } from './offlineQueueSchema';

// Web Lite is online-only. Keep canonical applySetCompletion, but fail loudly
// when it tries to queue an unsaved write. Never put account data in an unscoped
// browser queue or claim that a set was saved without server persistence.
const unavailable = () => new Error('Not saved. Web Lite requires a connection to Supabase; reconnect and retry.');
export async function enqueueOperation(_operation: OfflineOperation): Promise<void> { throw unavailable(); }
export async function loadOfflineQueue(_options?: { strict?: boolean }): Promise<OfflineOperation[]> { return []; }
export async function saveOfflineQueue(queue: OfflineOperation[]): Promise<void> {
  if (queue.length) throw unavailable();
}
export async function clearOfflineQueue(): Promise<void> { /* No offline web queue exists. */ }
export async function dequeueOperation(_id: string): Promise<void> { throw unavailable(); }
export async function getQueueSize(): Promise<number> { return 0; }
export function isRetryReady(_operation: OfflineOperation): boolean { return false; }
export function markRetryAttempt(_operation: OfflineOperation): OfflineOperation { throw unavailable(); }
