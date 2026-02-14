/**
 * Sentry error monitoring. Initializes only when EXPO_PUBLIC_SENTRY_DSN is set.
 * Create a project at sentry.io and add the DSN to .env
 */
import * as Sentry from '@sentry/react-native';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

export function initSentry(): void {
  if (!DSN) {
    if (__DEV__) {
      console.debug('[Sentry] DSN not set, skipping init');
    }
    return;
  }

  Sentry.init({
    dsn: DSN,
    enabled: !__DEV__,
    debug: __DEV__,
    tracesSampleRate: 0.2,
    sendDefaultPii: false,
  });
}

export { Sentry };
