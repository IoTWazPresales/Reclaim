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
 * Extract error information from Error object or other types
 */
function extractErrorInfo(error: any): {
  message: string;
  stack?: string;
  name?: string;
  code?: string;
  details?: any;
} {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: (error as any).code,
    };
  }
  return {
    message: String(error),
  };
}

/**
 * Get source location from stack trace (if available)
 */
function getSourceLocation(stack?: string): { file?: string; function?: string; line?: string } | null {
  if (!stack) return null;
  
  try {
    // Try to extract file and function from stack trace
    const lines = stack.split('\n');
    if (lines.length > 1) {
      const firstLine = lines[1]; // Skip the error message line
      // Match patterns like: "at functionName (file:///path/to/file.tsx:123:45)"
      const match = firstLine.match(/at\s+(?:(\w+)\s+\()?([^\s]+):(\d+):(\d+)/);
      if (match) {
        return {
          function: match[1] || 'anonymous',
          file: match[2],
          line: `${match[3]}:${match[4]}`,
        };
      }
    }
  } catch {
    // Ignore parsing errors
  }
  return null;
}

/**
 * Safely serialize an object, removing circular references and non-serializable values
 */
function safeSerialize(obj: any, maxDepth = 5, seen = new WeakSet()): any {
  if (obj === null || obj === undefined) return obj;
  if (maxDepth <= 0) return '[Max Depth Reached]';
  if (seen.has(obj)) return '[Circular Reference]';
  
  const type = typeof obj;
  if (type === 'string' || type === 'number' || type === 'boolean') return obj;
  if (type === 'function') return '[Function]';
  if (type === 'symbol') return '[Symbol]';
  
  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: obj.message,
      stack: obj.stack,
    };
  }
  
  if (obj instanceof Date) return obj.toISOString();
  if (obj instanceof RegExp) return obj.toString();
  
  if (Array.isArray(obj)) {
    seen.add(obj);
    const result = obj.map(item => safeSerialize(item, maxDepth - 1, seen));
    seen.delete(obj);
    return result;
  }
  
  if (type === 'object') {
    seen.add(obj);
    const result: any = {};
    try {
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          try {
            result[key] = safeSerialize(obj[key], maxDepth - 1, seen);
          } catch {
            result[key] = '[Serialization Error]';
          }
        }
      }
    } catch {
      return '[Object Serialization Failed]';
    }
    seen.delete(obj);
    return result;
  }
  
  return String(obj);
}

/**
 * Log error to Supabase logs table with comprehensive error information
 * Falls back silently if table doesn't exist or if Supabase isn't configured
 */
async function logErrorToSupabase(
  message: string,
  details?: any,
  error?: Error | any,
  context?: {
    category?: string;
    source?: string;
    tags?: Record<string, string>;
  }
) {
  try {
    // Only attempt logging if Supabase is configured
    if (!process.env.EXPO_PUBLIC_SUPABASE_URL) {
      return; // Silently skip if Supabase not configured
    }

    const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
    const userId = user?.id || null;

    // Extract error information
    const errorInfo = error ? extractErrorInfo(error) : null;
    const sourceLocation = errorInfo?.stack ? getSourceLocation(errorInfo.stack) : null;

    // Build comprehensive details object with safe serialization
    const logDetails: any = {
      originalMessage: message,
      ...(errorInfo && {
        errorName: errorInfo.name,
        errorCode: errorInfo.code,
        stackTrace: errorInfo.stack,
      }),
      ...(sourceLocation && {
        source: {
          file: sourceLocation.file,
          function: sourceLocation.function,
          line: sourceLocation.line,
        },
      }),
      ...(context && {
        category: context.category,
        source: context.source || sourceLocation?.file,
        tags: context.tags,
      }),
      ...(details && {
        context: details instanceof Error ? extractErrorInfo(details) : safeSerialize(details),
      }),
    };

    // Determine error category if not provided
    const category = context?.category || 
      (errorInfo?.name === 'TypeError' ? 'type_error' :
       errorInfo?.name === 'ReferenceError' ? 'reference_error' :
       errorInfo?.name === 'NetworkError' ? 'network_error' :
       errorInfo?.code ? 'api_error' :
       'unknown_error');

    const { error: insertError } = await supabase.from('logs').insert({
      user_id: userId,
      level: 'error',
      message: errorInfo?.message || message,
      details: logDetails,
      created_at: new Date().toISOString(),
    });
    
    if (insertError && isDev) {
      console.warn('[Logger] Failed to insert log:', insertError);
    } else if (isDev) {
      console.log('[Logger] Successfully logged error to Supabase:', {
        message: errorInfo?.message || message,
        category,
        userId,
      });
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
    
    // Extract error and message from args
    let error: Error | undefined;
    let message: string;
    let details: any;
    
    if (args.length > 0 && args[0] instanceof Error) {
      error = args[0];
      message = error.message || 'Unknown error';
      details = args.length > 1 ? args.slice(1) : undefined;
    } else {
      message = args.length > 0 ? String(args[0]) : 'Unknown error';
      details = args.length > 1 ? args.slice(1) : undefined;
      // Try to find Error object in details
      if (details && Array.isArray(details)) {
        const errorInDetails = details.find((arg) => arg instanceof Error);
        if (errorInDetails) {
          error = errorInDetails;
        }
      }
    }
    
    // Log to Supabase with comprehensive error information
    logErrorToSupabase(message, details, error, {
      category: 'runtime_error',
    }).catch(() => {
      // Already handled silently in logErrorToSupabase
    });

    // Log to Sentry if available
    if (error) {
      logErrorToSentry(error, {
        message,
        details: details instanceof Error ? undefined : details,
      });
    } else if (args.length > 0) {
      // Convert non-Error to Error for Sentry
      try {
        const sentryError = new Error(message);
        logErrorToSentry(sentryError, {
          details: details,
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
   * 
   * @param message - Error message
   * @param error - Error object (optional)
   * @param context - Additional context (category, source, tags)
   */
  logError: async (
    message: string,
    error?: Error | any,
    context?: {
      category?: string;
      source?: string;
      tags?: Record<string, string>;
    }
  ) => {
    console.error('[Reclaim ERROR]', message, error);
    
    const errorObj = error instanceof Error ? error : undefined;
    const details = error instanceof Error ? undefined : error;
    
    // Log to Supabase with comprehensive information
    await logErrorToSupabase(message, details, errorObj, context).catch(() => {
      // Already handled silently
    });

    // Log to Sentry if available
    const sentryError = errorObj || new Error(message);
    logErrorToSentry(sentryError, {
      message,
      details: details,
      ...context,
    });
  },
  
  /**
   * Log a warning to Supabase (for important warnings that should be tracked)
   */
  logWarning: async (
    message: string,
    details?: any,
    context?: {
      category?: string;
      source?: string;
      tags?: Record<string, string>;
    }
  ) => {
    console.warn('[Reclaim WARNING]', message, details);
    
    try {
      if (!process.env.EXPO_PUBLIC_SUPABASE_URL) {
        return;
      }

      const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
      const userId = user?.id || null;

      const logDetails: any = {
        message,
        ...(details && { context: details }),
        ...(context && {
          category: context.category,
          source: context.source,
          tags: context.tags,
        }),
      };

      await supabase.from('logs').insert({
        user_id: userId,
        level: 'warning',
        message,
        details: logDetails,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      // Silent fail
      if (isDev) {
        console.warn('[Logger] Failed to log warning to Supabase:', err);
      }
    }
  },
};

