import * as SecureStore from 'expo-secure-store';

const KEY_PREFIX = 'reclaim_has_onboarded_v1';
const LEGACY_KEY = KEY_PREFIX; // previous global flag (no user scoping)

function getKeyForUser(userId: string) {
  return `${KEY_PREFIX}:${userId}`;
}

/** Monotonic: only ever writes true. Ignores false overwrites. */
export async function setHasOnboarded(userId: string | null | undefined, value: boolean) {
  if (!userId) return;
  if (value !== true) return; // monotonic: never downgrade to false
  try {
    await SecureStore.setItemAsync(getKeyForUser(userId), '1');
  } catch {
    // ignore
  }
}

export async function getHasOnboarded(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  const userKey = getKeyForUser(userId);

  try {
    const value = await SecureStore.getItemAsync(userKey);
    if (value !== null) {
      return value === '1';
    }

    // Migration: fall back to legacy global flag once, then store per-user
    const legacyValue = await SecureStore.getItemAsync(LEGACY_KEY);
    if (legacyValue !== null) {
      try {
        await SecureStore.setItemAsync(userKey, legacyValue);
        await SecureStore.deleteItemAsync(LEGACY_KEY);
      } catch {
        // ignore migration errors
      }
      return legacyValue === '1';
    }
  } catch {
    // ignore read errors
  }

  return false;
}
