/**
 * Re-exports the StorageAdapter contract. Implementation lives in AsyncStorageAdapter.
 * Seam for future storage swapping (SecureStore, in-memory for tests).
 */

export type { StorageAdapter } from './types';
