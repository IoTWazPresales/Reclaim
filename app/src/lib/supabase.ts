// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ Always pull from process.env for Expo (EAS builds use these automatically)
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const SECURESTORE_LIMIT = 1900; // Expo SecureStore warns above ~2KB
const FALLBACK_PREFIX = '@reclaim/supabase/fallback/';
// Same key as Supabase's default; explicit so account deletion can purge both stores.
const AUTH_STORAGE_KEY = `sb-${new URL(SUPABASE_URL || 'https://placeholder.supabase.co').hostname.split('.')[0]}-auth-token`;
const deletedAccountIds = new Set<string>();

export function isDeletedAccount(userId: string): boolean {
  return deletedAccountIds.has(userId);
}

function belongsToDeletedAccount(value: string): boolean {
  try {
    return isDeletedAccount(JSON.parse(value)?.user?.id);
  } catch (error) {
    // Bootstrap storage cannot import logger (logger itself imports this client).
    if (__DEV__) console.warn('[auth] unreadable persisted session');
    return false;
  }
}

async function getFallbackItem(key: string) {
  try {
    return await AsyncStorage.getItem(`${FALLBACK_PREFIX}${key}`);
  } catch {
    return null;
  }
}

async function setFallbackItem(key: string, value: string) {
  try {
    await AsyncStorage.setItem(`${FALLBACK_PREFIX}${key}`, value);
  } catch {
    // ignore
  }
}

async function removeFallbackItem(key: string) {
  try {
    await AsyncStorage.removeItem(`${FALLBACK_PREFIX}${key}`);
  } catch {
    // ignore
  }
}

// ✅ Enhanced storage with guard for large payloads
const storage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const secureValue = await SecureStore.getItemAsync(key);
      if (secureValue !== null) {
        return key === AUTH_STORAGE_KEY && belongsToDeletedAccount(secureValue) ? null : secureValue;
      }
    } catch (error) {
      // Silent fail - logger might not be ready yet
    }
    const fallback = await getFallbackItem(key);
    return key === AUTH_STORAGE_KEY && fallback && belongsToDeletedAccount(fallback) ? null : fallback;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    // A late refresh must not re-persist an identity the server has deleted.
    if (key === AUTH_STORAGE_KEY && belongsToDeletedAccount(value)) return;
    if (value && value.length > SECURESTORE_LIMIT) {
      await setFallbackItem(key, value);
      try {
        await SecureStore.deleteItemAsync(key);
      } catch {
        // ignore
      }
      return;
    }
    try {
      await SecureStore.setItemAsync(key, value);
      await removeFallbackItem(key);
    } catch (error) {
      // Silent fail - logger might not be ready yet
      await setFallbackItem(key, value);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      // Silent fail - logger might not be ready yet
    }
    await removeFallbackItem(key);
  },
};

// ✅ Create the Supabase client with enhanced session persistence
// Use empty strings if env vars are missing - App.tsx will show error screen
export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder-key',
  {
  auth: {
    storageKey: AUTH_STORAGE_KEY,
    // mobile-friendly PKCE flow prevents redirect issues
    flowType: 'pkce',
    detectSessionInUrl: false,
    persistSession: true,
    autoRefreshToken: true,
      // Enhanced storage for better session persistence
      storage,
  },
  }
);

/** Only call AFTER the server confirms auth-user deletion. Never for ordinary logout.
 * Invalidate the deleted identity before touching fallible disk I/O. The public SDK
 * then sees no session and emits SIGNED_OUT without depending on a logout network call.
 * Keep the tombstone for this process so late refresh/initial-load results cannot revive it.
 */
export async function clearDeletedAccountSession(userId: string): Promise<string[]> {
  deletedAccountIds.add(userId);
  const failures: string[] = [];
  for (const key of [AUTH_STORAGE_KEY, `${AUTH_STORAGE_KEY}-code-verifier`, `${AUTH_STORAGE_KEY}-user`]) {
    for (const remove of [
      () => SecureStore.deleteItemAsync(key),
      () => AsyncStorage.removeItem(`${FALLBACK_PREFIX}${key}`),
    ]) {
      try {
        await remove();
      } catch (error) {
        failures.push('Saved sign-in details');
        console.warn('[auth] deleted-account credential cleanup failed');
      }
    }
  }
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) throw error;
  return [...new Set(failures)];
}
