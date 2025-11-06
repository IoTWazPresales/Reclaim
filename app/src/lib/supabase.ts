// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// ✅ Always pull from process.env for Expo (EAS builds use these automatically)
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// ✅ Enhanced storage using SecureStore for sensitive tokens
const storage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      // Silent fail - logger might not be ready yet
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      // Silent fail - logger might not be ready yet
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      // Silent fail - logger might not be ready yet
    }
  },
};

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
