// C:\Reclaim\app\App.tsx
// ⚠️ CRITICAL: react-native-reanimated must be imported FIRST, before anything else!
try {
  require('react-native-reanimated');
} catch (error) {
  if (__DEV__) {
    console.warn('Reanimated import failed (OK when connecting to dev server):', error);
  }
}

import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Platform, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { PaperProvider } from 'react-native-paper';

import { AuthProvider } from '@/providers/AuthProvider';
import RootNavigator from '@/routing/RootNavigator';
import { useNotifications } from '@/hooks/useNotifications';
import { supabase } from '@/lib/supabase';
import { setSessionFromDeepLink } from '@/lib/authSessionService';
import { logger } from '@/lib/logger';
import { appDarkTheme, useAppTheme } from '@/theme';
import { getUserSettings } from '@/lib/userSettings';

// Import background sync to ensure task is defined before registration
import { enableBackgroundHealthSync, disableBackgroundHealthSync } from '@/lib/backgroundSync';
import { logTelemetry } from '@/lib/telemetry';
import { InsightsProvider } from '@/providers/InsightsProvider';
import { NetworkStatusIndicator } from '@/components/NetworkStatusIndicator';
import { useAppUpdates } from '@/hooks/useAppUpdates';
import { startHealthTriggers } from '@/lib/health';
import AsyncStorage from '@react-native-async-storage/async-storage';
// ✅ Notification reconciliation entrypoint
import { reconcileNotifications } from '@/lib/notifications/NotificationScheduler';

// ---------- 1) Global notifications handler ----------
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    // legacy for older SDKs
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// ---------- 2) Enhanced error boundary with recovery options ----------
type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
  errorId?: string;
  errorInfo?: React.ErrorInfo;
};

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `ERR-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    return { hasError: true, error, errorId };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger
      .logError('ErrorBoundary caught error', error, {
        category: 'react_error_boundary',
        source: 'ErrorBoundary',
        tags: {
          errorId: this.state.errorId || 'unknown',
          retryCount: String(this.retryCount),
        },
      })
      .catch(() => {});

    logger.error('ErrorBoundary caught error:', error, errorInfo);

    this.setState({
      errorInfo: {
        componentStack: errorInfo?.componentStack ? String(errorInfo.componentStack).substring(0, 1000) : undefined,
      } as React.ErrorInfo,
    });
  }

  handleReload = () => {
    if (this.retryCount >= this.maxRetries) {
      this.retryCount = 0;
      this.setState({ hasError: false, error: undefined, errorId: undefined, errorInfo: undefined });
    } else {
      this.retryCount += 1;
      this.setState({ hasError: false, error: undefined });
    }
  };

  handleReportError = async () => {
    if (!this.state.error || !this.state.errorId) return;

    try {
      await logTelemetry({
        name: 'error_reported',
        properties: { errorId: this.state.errorId, hasStack: !!this.state.error?.stack },
        severity: 'error',
      });

      Alert.alert(
        'Error Reported',
        `Error ID: ${this.state.errorId}\n\nYour error has been logged. Thank you for helping us improve!`,
      );
    } catch (err) {
      logger.warn('Failed to report error:', err);
    }
  };

  render() {
    if (this.state.hasError) {
      const colors = appDarkTheme.colors;
      const errorId = this.state.errorId || 'Unknown';

      return (
        <SafeAreaProvider>
          <View style={{ flex: 1, backgroundColor: colors.background, padding: 16, justifyContent: 'center' }}>
            <Text style={{ color: colors.onBackground, fontSize: 20, fontWeight: '700', marginBottom: 8 }}>
              Something went wrong
            </Text>
            <Text style={{ color: colors.onBackground, opacity: 0.75, marginBottom: 8, lineHeight: 20 }}>
              The app encountered an unexpected error. Don't worry—your data is safe. You can try reloading the app.
            </Text>
            <Text
              style={{
                color: colors.onSurfaceVariant,
                fontSize: 12,
                marginBottom: 24,
                fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
              }}
            >
              Error ID: {errorId}
            </Text>

            <TouchableOpacity
              onPress={this.handleReload}
              style={{
                backgroundColor: colors.primary,
                paddingVertical: 14,
                paddingHorizontal: 24,
                borderRadius: 10,
                marginBottom: 12,
              }}
            >
              <Text style={{ color: colors.onPrimary, textAlign: 'center', fontWeight: '700', fontSize: 16 }}>
                {this.retryCount >= this.maxRetries ? 'Reset App' : 'Reload App'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={this.handleReportError}
              style={{
                backgroundColor: colors.surfaceVariant,
                paddingVertical: 12,
                paddingHorizontal: 24,
                borderRadius: 10,
                marginBottom: 12,
              }}
            >
              <Text style={{ color: colors.onSurfaceVariant, textAlign: 'center', fontWeight: '600' }}>
                Report Error
              </Text>
            </TouchableOpacity>

            {__DEV__ && this.state.error ? (
              <View style={{ marginTop: 24, padding: 12, backgroundColor: colors.errorContainer || '#ffebee', borderRadius: 8 }}>
                <Text style={{ color: colors.error, fontSize: 12, fontFamily: 'monospace' }}>
                  {String(this.state.error?.message ?? this.state.error)}
                </Text>
                {this.state.error?.stack ? (
                  <Text style={{ color: colors.error, fontSize: 10, marginTop: 8, fontFamily: 'monospace', opacity: 0.8 }} numberOfLines={10}>
                    {this.state.error.stack.substring(0, 500)}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
        </SafeAreaProvider>
      );
    }

    return this.props.children;
  }
}

// ---------- 3) Global error handlers for unhandled errors ----------
if (typeof ErrorUtils !== 'undefined') {
  const originalGlobalHandler = ErrorUtils.getGlobalHandler();

  ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    logger
      .logError('Unhandled error', error, {
        category: 'unhandled_error',
        source: 'GlobalErrorHandler',
        tags: { isFatal: String(isFatal || false) },
      })
      .catch(() => {});

    if (originalGlobalHandler) originalGlobalHandler(error, isFatal);
    else console.error('Unhandled error:', error);
  });
}

if (typeof global !== 'undefined') {
  const originalUnhandledRejection = (global as any).onunhandledrejection;

  (global as any).onunhandledrejection = (event: PromiseRejectionEvent | { reason: any }) => {
    const reason = 'reason' in event ? event.reason : event;
    const error = reason instanceof Error ? reason : new Error(String(reason));

    logger
      .logError('Unhandled promise rejection', error, {
        category: 'unhandled_promise_rejection',
        source: 'GlobalErrorHandler',
        tags: { type: typeof reason },
      })
      .catch(() => {});

    if (originalUnhandledRejection) originalUnhandledRejection(event);
    else console.error('Unhandled promise rejection:', reason);
  };
}

// ---------- 4) Config guard ----------
function getConfig() {
  const expoConfig = Constants.expoConfig as any;
  const manifest = Constants.manifest as any;
  const manifest2 = Constants.manifest2 as any;

  const extra1 = expoConfig?.extra ?? {};
  const extra2 = manifest?.extra ?? {};
  const extra3 = manifest2?.extra?.expoClient?.extra ?? {};

  const supabaseUrl =
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    extra1?.supabaseUrl ||
    extra2?.supabaseUrl ||
    extra3?.supabaseUrl ||
    '';

  const supabaseAnonKey =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    extra1?.supabaseAnonKey ||
    extra2?.supabaseAnonKey ||
    extra3?.supabaseAnonKey ||
    '';

  return { supabaseUrl, supabaseAnonKey };
}

function ConfigErrorScreen({ supabaseUrl, supabaseAnonKey }: { supabaseUrl?: string; supabaseAnonKey?: string }) {
  const theme = useAppTheme();
  const colors = theme.colors;

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: colors.background, padding: 20, justifyContent: 'center' }}>
        <Text style={{ color: colors.onBackground, fontSize: 20, fontWeight: '800', marginBottom: 8 }}>
          Missing Configuration
        </Text>
        <Text style={{ color: colors.onBackground, opacity: 0.75, marginBottom: 16 }}>
          The app needs your Supabase settings to start.
        </Text>

        <Text style={{ color: colors.secondary, fontWeight: '700', marginBottom: 6 }}>Required:</Text>
        <Text style={{ color: colors.onBackground, opacity: 0.75 }}>EXPO_PUBLIC_SUPABASE_URL</Text>
        <Text style={{ color: colors.onBackground, opacity: 0.75 }}>EXPO_PUBLIC_SUPABASE_ANON_KEY</Text>

        <Text style={{ color: colors.secondary, fontWeight: '700', marginTop: 16, marginBottom: 6 }}>How to set:</Text>
        <Text style={{ color: colors.onBackground, opacity: 0.75, marginBottom: 8 }}>
          • Create a <Text style={{ fontWeight: '700', color: colors.onBackground }}>.env</Text> file in the{' '}
          <Text style={{ fontWeight: '700', color: colors.onBackground }}>app</Text> directory
        </Text>

        <Text
          style={{
            color: colors.primary,
            backgroundColor: colors.inverseSurface,
            padding: 10,
            borderRadius: 8,
            marginBottom: 8,
            fontFamily: 'monospace',
          }}
        >
{`EXPO_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
EXPO_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOi..."`}
        </Text>

        <Text style={{ color: colors.onBackground, opacity: 0.75, marginBottom: 8 }}>
          Then restart: <Text style={{ fontWeight: '700', color: colors.onBackground }}>npx expo start --clear</Text>
        </Text>

        {__DEV__ ? (
          <>
            <Text style={{ color: colors.error, marginTop: 16 }}>Debug: url={String(supabaseUrl || '(empty)')}</Text>
            <Text style={{ color: colors.error }}>Debug: anonKey={supabaseAnonKey ? '(set)' : '(empty)'}</Text>
          </>
        ) : null}
      </View>
    </SafeAreaProvider>
  );
}

// ---------- 5) Deep-link → Supabase session bridge (nav-free) ----------
function DeepLinkAuthBridge() {
  useEffect(() => {
    const handleUrl = async (url: string) => {
      if (!url) return;
      try {
        await setSessionFromDeepLink(url);
      } catch (err) {
        logger.error('Auth deep link error:', err);
      }
    };

    Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl) handleUrl(initialUrl);
    });

    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(() => {});
    return () => sub.subscription.unsubscribe();
  }, []);

  return null;
}

// ---------- 6) Query client ----------
const qc = new QueryClient();

/**
 * AppShell is where hooks live.
 * App() only does config gating (so we never violate hooks rules).
 */
function AppShell() {
  useNotifications();
  const { isUpdatePending } = useAppUpdates();

  // Intent capture from notification taps
  useEffect(() => {
    const INTENT_KEY = '@reclaim/routine_intent';
    const sub = Notifications.addNotificationResponseReceivedListener(async (response) => {
      try {
        const data = (response?.notification?.request?.content?.data ?? {}) as any;
        if (data?.action) {
          const intent = {
            action: data.action,
            date: data.date ?? null,
            firstId: data.firstId ?? null,
            ts: Date.now(),
          };
          (globalThis as any).__routineIntent = intent;
          await AsyncStorage.setItem(INTENT_KEY, JSON.stringify(intent));
        }
      } catch {
        // ignore
      }
    });

    return () => sub.remove();
  }, []);

  useEffect(() => {
    logger.debug('[APP_BOOT] reconciling notifications');
    reconcileNotifications().catch((e) => logger.warn('[NOTIF_RECON] failed', e));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        logger.debug('[APP_BOOT] init sync + telemetry');
        const settings = await getUserSettings();

        if (settings.backgroundSyncEnabled) {
          await enableBackgroundHealthSync();
        } else {
          await disableBackgroundHealthSync();
        }

        await logTelemetry({
          name: 'app_launched',
          properties: {
            platform: Platform.OS,
            badgesEnabled: settings.badgesEnabled,
            backgroundSyncEnabled: settings.backgroundSyncEnabled,
            updatePending: isUpdatePending,
          },
        });
      } catch (error) {
        logger.warn('Background sync init error:', error);
      }
    })();
  }, [isUpdatePending]);

  // Android channel (safe). Note: Scheduler also ensures channels, but this is fine.
  useEffect(() => {
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        enableLights: false,
        bypassDnd: false,
      }).catch((e) => logger.warn('Failed to set Android notification channel:', e));
    }
  }, []);

  return (
    <PaperProvider theme={appDarkTheme}>
      <ErrorBoundary>
        <SafeAreaProvider>
          <AuthProvider>
            <InsightsProvider>
              <DeepLinkAuthBridge />
              <View style={{ flex: 1 }}>
                <NetworkStatusIndicator />
                <RootNavigator />
              </View>
            </InsightsProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    </PaperProvider>
  );
}

// ---------- 7) App root ----------
export default function App() {
  const { supabaseUrl, supabaseAnonKey } = getConfig();

  useEffect(() => {
    logger.debug('[APP_BOOT] App.tsx mounted');
  }, []);

  if (__DEV__) {
    logger.debug('Config check:', {
      supabaseUrl: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'EMPTY',
      supabaseAnonKey: supabaseAnonKey ? 'SET' : 'EMPTY',
      hasProcessEnv: !!process.env.EXPO_PUBLIC_SUPABASE_URL,
      hasExpoConfig: !!(Constants.expoConfig as any)?.extra?.supabaseUrl,
      hasManifest: !!(Constants.manifest as any)?.extra?.supabaseUrl,
    });
  }

  const missingEnv = !supabaseUrl || !supabaseAnonKey;

  return (
    <QueryClientProvider client={qc}>
      {missingEnv ? (
        <PaperProvider theme={appDarkTheme}>
          <ConfigErrorScreen supabaseUrl={supabaseUrl} supabaseAnonKey={supabaseAnonKey} />
        </PaperProvider>
      ) : (
        <AppShell />
      )}
    </QueryClientProvider>
  );
}
