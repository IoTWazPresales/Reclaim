/**
 * Centralized logging utility that respects environment
 * Only logs in development, can be extended for production error tracking
 */

import { supabase } from './supabase';

const isDev = __DEV__;

/**
 * Log error to Supabase logs table
 * Falls back silently if table doesn't exist or if Supabase isn't configured
 */
async function logErrorToSupabase(message: string, details?: any) {
  try {
    // Only attempt logging if Supabase is configured
    if (!process.env.EXPO_PUBLIC_SUPABASE_URL) {
      return; // Silently skip if Supabase not configured
    }

    const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
    const userId = user?.id || null;

    const { error: insertError } = await supabase.from('logs').insert({
      user_id: userId,
      level: 'error',
      message: typeof message === 'string' ? message : JSON.stringify(message),
      details: details ? (typeof details === 'object' ? JSON.stringify(details) : String(details)) : null,
      created_at: new Date().toISOString(),
    });
    
    if (insertError && isDev) {
      console.warn('[Logger] Failed to insert log:', insertError);
    }
  } catch (err) {
    // Silent fail - don't break the app if logging fails
    if (isDev) {
      console.warn('[Logger] Failed to log to Supabase:', err);
    }
  }
}

export const logger = {
  log: (...args: any[]) => {
    if (isDev) {
      console.log('[Reclaim]', ...args);
    }
  },
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn('[Reclaim]', ...args);
    }
    // TODO: In production, send to error tracking service (Sentry, etc.)
  },
  error: (...args: any[]) => {
    console.error('[Reclaim]', ...args);
    
    // Log to Supabase if available
    const message = args.length > 0 ? String(args[0]) : 'Unknown error';
    const details = args.length > 1 ? args.slice(1) : undefined;
    logErrorToSupabase(message, details).catch(() => {
      // Already handled silently in logErrorToSupabase
    });
  },
  debug: (...args: any[]) => {
    if (isDev) {
      console.log('[Reclaim DEBUG]', ...args);
    }
  },
  /**
   * Explicitly log an error to Supabase logs table
   * Use this for critical errors that need to be tracked
   */
  logError: async (message: string, details?: any) => {
    console.error('[Reclaim ERROR]', message, details);
    await logErrorToSupabase(message, details);
  },
};

