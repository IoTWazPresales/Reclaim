// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// ✅ Always pull from process.env for Expo (EAS builds use these automatically)
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// ✅ Sanity check (optional but recommended for crash-free builds)
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '[Supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY — check EAS env or eas.json env.'
  );
}

// ✅ Create the Supabase client
export const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
  auth: {
    // mobile-friendly PKCE flow prevents redirect issues
    flowType: 'pkce',
    detectSessionInUrl: false,
    persistSession: true,
    autoRefreshToken: true,
  },
});
