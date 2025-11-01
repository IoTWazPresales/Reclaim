/**
 * Centralized logging utility that respects environment
 * Only logs in development, can be extended for production error tracking
 */

const isDev = __DEV__;

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
    // TODO: In production, send to error tracking service (Sentry, etc.)
  },
  debug: (...args: any[]) => {
    if (isDev) {
      console.log('[Reclaim DEBUG]', ...args);
    }
  },
};

