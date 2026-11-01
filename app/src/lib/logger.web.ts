import { sanitizeLogPayload } from './logSanitizer';

// No native Sentry initialization or unauthenticated remote log writes in the spike.
const write = (level: 'log' | 'info' | 'warn' | 'error' | 'debug', args: unknown[]) => {
  if (__DEV__ || level === 'error' || level === 'warn') {
    console[level](...args.map(value => sanitizeLogPayload(value)));
  }
};
export const logger = {
  log: (...args: unknown[]) => write('log', args),
  info: (...args: unknown[]) => write('info', args),
  warn: (...args: unknown[]) => write('warn', args),
  error: (...args: unknown[]) => write('error', args),
  debug: (...args: unknown[]) => write('debug', args),
  logError: async (...args: unknown[]) => { write('error', args); },
  logWarning: async (...args: unknown[]) => { write('warn', args); },
};
