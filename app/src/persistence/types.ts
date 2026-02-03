/**
 * Persistence layer contracts. Single source of truth for storage adapters.
 * Enables swapping implementations (AsyncStorage, SecureStore, in-memory for tests)
 * without changing consumers.
 */

/**
 * Contract for key-value storage adapters. All implementations must satisfy this interface
 * for consistent, type-safe persistence across the app.
 */
export interface StorageAdapter {
  getString(key: string): Promise<string | null>;
  setString(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  getJSON<T>(key: string): Promise<T | null>;
  setJSON(key: string, value: unknown): Promise<void>;
  getBoolean(key: string): Promise<boolean | null>;
  setBoolean(key: string, value: boolean): Promise<void>;
}
