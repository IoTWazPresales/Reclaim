// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { logger } from './logger';

// ✅ Always pull from process.env for Expo (EAS builds use these automatically)
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// ✅ Sanity check (optional but recommended for crash-free builds)
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  logger.warn(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY — check EAS env or eas.json env.'
  );
}

// ✅ Enhanced storage using SecureStore for sensitive tokens
const storage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      logger.warn('Storage getItem error:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      logger.warn('Storage setItem error:', error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      logger.warn('Storage removeItem error:', error);
    }
  },
};

// ✅ Create the Supabase client with enhanced session persistence
export const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
  auth: {
    // mobile-friendly PKCE flow prevents redirect issues
    flowType: 'pkce',
    detectSessionInUrl: false,
    persistSession: true,
    autoRefreshToken: true,
    // Enhanced storage for better session persistence
    storage,
    // Refresh token rotation enabled for security
    persistSessionOptions: {
      refreshTokenRotationEnabled: true,
    },
  },
});
