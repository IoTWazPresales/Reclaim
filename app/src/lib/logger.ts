/**
 * Centralized logging utility that respects environment
 * Supports Supabase logging and optional Sentry integration
 */

import { supabase } from './supabase';

const isDev = __DEV__;

// Optional Sentry integration - only used if installed and configured
let Sentry: {
  captureException: (error: Error, options?: any) => void;
  captureMessage: (message: string, level?: string) => void;
  setUser: (user: { id: string; email?: string } | null) => void;
} | null = null;

try {
  // Try to load Sentry - it may not be installed
  const sentryModule = require('@sentry/react-native');
  if (sentryModule && typeof sentryModule.captureException === 'function') {
    Sentry = sentryModule;
  }
} catch {
  // Sentry not installed - that's fine, we'll just skip it
}

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

/**
 * Log error to Sentry if configured
 * Falls back silently if Sentry isn't installed or configured
 */
function logErrorToSentry(error: Error, context?: Record<string, any>) {
  if (!Sentry) return; // Sentry not installed or not initialized

  try {
    Sentry.captureException(error, {
      contexts: context ? { custom: context } : undefined,
      tags: context?.tags || {},
    });
  } catch (err) {
    // Silent fail - don't break the app if Sentry fails
    if (isDev) {
      console.warn('[Logger] Failed to log to Sentry:', err);
    }
  }
}

/**
 * Set user context for Sentry (optional)
 * Call this when user logs in/out to track errors by user
 */
export function setSentryUser(userId: string | null, email?: string | null) {
  if (!Sentry) return;

  try {
    if (userId) {
      Sentry.setUser({ id: userId, email: email || undefined });
    } else {
      Sentry.setUser(null);
    }
  } catch (err) {
    if (isDev) {
      console.warn('[Logger] Failed to set Sentry user:', err);
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

    // In production, optionally send warnings to Sentry
    if (!isDev && Sentry && args.length > 0) {
      try {
        const message = String(args[0]);
        Sentry.captureMessage(message, 'warning');
      } catch {
        // Silent fail
      }
    }
  },
  error: (...args: any[]) => {
    console.error('[Reclaim]', ...args);
    
    // Log to Supabase if available
    const message = args.length > 0 ? String(args[0]) : 'Unknown error';
    const details = args.length > 1 ? args.slice(1) : undefined;
    logErrorToSupabase(message, details).catch(() => {
      // Already handled silently in logErrorToSupabase
    });

    // Log to Sentry if available (only for actual Error objects)
    if (args.length > 0 && args[0] instanceof Error) {
      logErrorToSentry(args[0], {
        message,
        details: args.slice(1),
      });
    } else if (args.length > 0) {
      // Convert non-Error to Error for Sentry
      try {
        const error = new Error(message);
        logErrorToSentry(error, {
          details: args.slice(1),
        });
      } catch {
        // Silent fail
      }
    }
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
    
    // Log to Supabase
    await logErrorToSupabase(message, details).catch(() => {
      // Already handled silently
    });

    // Log to Sentry if available
    const error = details instanceof Error ? details : new Error(message);
    logErrorToSentry(error, {
      message,
      details: details instanceof Error ? undefined : details,
    });
  },
};

