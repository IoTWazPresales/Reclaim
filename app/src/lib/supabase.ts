// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ Always pull from process.env for Expo (EAS builds use these automatically)
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const SECURESTORE_LIMIT = 1900; // Expo SecureStore warns above ~2KB
const FALLBACK_PREFIX = '@reclaim/supabase/fallback/';
/** Key Supabase auth-js uses for PKCE code_verifier (default storageKey + '-code-verifier'). */
export const PKCE_VERIFIER_STORAGE_KEY = 'supabase.auth.token-code-verifier';

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
        return secureValue;
      }
    } catch (error) {
      // Silent fail - logger might not be ready yet
    }
    return getFallbackItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (key === PKCE_VERIFIER_STORAGE_KEY && value) {
      try {
        console.warn('[AUTH_PKCE] verifier stored, key=', key);
      } catch {
        // no-op
      }
    }
    if (value && value.length > SECURESTORE_LIMIT) {
      await setFallbackItem(key, value);
      try {
        await SecureStore.deleteItemAsync(key);
      } catch {
        // ignore
      }
      if (__DEV__) {
        console.warn(
          '[Supabase] Session payload exceeds SecureStore limit; using AsyncStorage fallback.',
        );
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

/**
 * Check if PKCE code_verifier exists in storage (same key Supabase uses).
 * Use before exchangeCodeForSession to avoid "both auth code and code verifier should be non-empty".
 */
export async function hasPKCEVerifier(): Promise<{ present: boolean; length: number }> {
  try {
    let value: string | null = await SecureStore.getItemAsync(PKCE_VERIFIER_STORAGE_KEY);
    if (value === null) value = await getFallbackItem(PKCE_VERIFIER_STORAGE_KEY);
    const len = (value ?? '').length;
    return { present: len > 0, length: len };
  } catch {
    return { present: false, length: 0 };
  }
}

// ✅ Create the Supabase client with enhanced session persistence
// Use empty strings if env vars are missing - App.tsx will show error screen
export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder-key',
  {
  auth: {
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
