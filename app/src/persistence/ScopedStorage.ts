/**
 * Storage namespace keyed by userId. Prefixes keys with userId for per-user isolation.
 * No migration of existing keys; additive helpers only.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const SCOPE_PREFIX = 'reclaim:scope:';

function scopedKey(userId: string, key: string): string {
  return `${SCOPE_PREFIX}${userId}:${key}`;
}

export async function getItemScoped(userId: string, key: string): Promise<string | null> {
  return AsyncStorage.getItem(scopedKey(userId, key));
}

export async function setItemScoped(userId: string, key: string, value: string): Promise<void> {
  await AsyncStorage.setItem(scopedKey(userId, key), value);
}

export async function removeItemScoped(userId: string, key: string): Promise<void> {
  await AsyncStorage.removeItem(scopedKey(userId, key));
}
