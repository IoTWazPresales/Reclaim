/**
 * AsyncStorage-backed implementation of StorageAdapter.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/logger';
import type { StorageAdapter } from './types';

export class AsyncStorageAdapter implements StorageAdapter {
  async getString(key: string): Promise<string | null> {
    const v = await AsyncStorage.getItem(key);
    logger.debug('[PERSIST_ADAPTER] getString', key, v != null ? 'hit' : 'miss');
    return v;
  }

  async setString(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
    logger.debug('[PERSIST_ADAPTER] setString', key);
  }

  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
    logger.debug('[PERSIST_ADAPTER] remove', key);
  }

  async getJSON<T>(key: string): Promise<T | null> {
    const raw = await this.getString(key);
    if (raw == null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async setJSON(key: string, value: unknown): Promise<void> {
    await this.setString(key, JSON.stringify(value));
  }

  async getBoolean(key: string): Promise<boolean | null> {
    const raw = await this.getString(key);
    if (raw == null) return null;
    if (raw === 'true' || raw === '1') return true;
    if (raw === 'false' || raw === '0') return false;
    return null;
  }

  async setBoolean(key: string, value: boolean): Promise<void> {
    await this.setString(key, value ? '1' : '0');
  }
}
