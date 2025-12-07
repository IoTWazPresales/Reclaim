// C:\Reclaim\app\App.tsx
// ⚠️ CRITICAL: react-native-reanimated must be imported FIRST, before anything else!
// Try to import Reanimated, but don't crash if it fails (for dev server connection issues)
try {
  require('react-native-reanimated');
} catch (error) {
  // Reanimated might not be ready when connecting to dev server
  // Log but don't crash - app can still work
  if (__DEV__) {
    console.warn('Reanimated import failed (this is OK if connecting to dev server):', error);
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
import { getLastEmail } from '@/state/authCache';
import { logger } from '@/lib/logger';
import { appLightTheme, useAppTheme } from '@/theme';
import { getUserSettings } from '@/lib/userSettings';
// Import background sync to ensure task is defined before registration
import '@/lib/backgroundSync';
import { enableBackgroundHealthSync, disableBackgroundHealthSync } from '@/lib/backgroundSync';
import { logTelemetry } from '@/lib/telemetry';
import { InsightsProvider } from '@/providers/InsightsProvider';
import { NetworkStatusIndicator } from '@/components/NetworkStatusIndicator';
import { useAppUpdates } from '@/hooks/useAppUpdates';
import { startHealthTriggers } from '@/lib/health';

// ---------- 1) Global notifications handler ----------
Notifications.setNotificationHandler({
  handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      // legacy for very old SDKs
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

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Generate a unique error ID for tracking
    const errorId = `ERR-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorMessage = error?.message || String(error);
    const errorDetails = {
      error: errorMessage,
      stack: error?.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      retryCount: this.retryCount,
    };

    this.setState({ errorInfo });

    // Log to Supabase with comprehensive error information
    logger.logError('ErrorBoundary caught error', error, {
      category: 'react_error_boundary',
      source: 'ErrorBoundary',
      tags: {
        errorId: this.state.errorId || 'unknown',
        retryCount: String(this.retryCount),
      },
    }).catch(() => {
      // Silent fail - don't break error reporting
    });

    // Log to console
    logger.error('ErrorBoundary caught error:', error, errorInfo);

    // In production, this could also send to Sentry if configured
    // if (Sentry) {
    //   Sentry.captureException(error, {
    //     contexts: { react: { componentStack: errorInfo.componentStack } },
    //     tags: { errorId: this.state.errorId },
    //   });
    // }
  }

  handleReload = () => {
    if (this.retryCount >= this.maxRetries) {
      // After max retries, reset completely
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
      // In a real app, you'd open email or a feedback form with error details
      const errorReport = {
        errorId: this.state.errorId,
        message: this.state.error?.message,
        stack: this.state.error?.stack?.substring(0, 1000), // Limit size
        timestamp: new Date().toISOString(),
      };

      // Log telemetry event
      await logTelemetry({
        name: 'error_reported',
        properties: { errorId: this.state.errorId, hasStack: !!this.state.error?.stack },
        severity: 'error',
      });

      // For now, just show an alert - could be enhanced with email client or feedback form
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
      const colors = appLightTheme.colors;
      const errorId = this.state.errorId || 'Unknown';

      return (
        <SafeAreaProvider>
          <View
            style={{
              flex: 1,
              backgroundColor: colors.background,
              padding: 16,
              justifyContent: 'center',
            }}
          >
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
              <View
                style={{
                  marginTop: 24,
                  padding: 12,
                  backgroundColor: colors.errorContainer || '#ffebee',
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: colors.error, fontSize: 12, fontFamily: 'monospace' }}>
                  {String(this.state.error?.message ?? this.state.error)}
                </Text>
                {this.state.error?.stack ? (
                  <Text
                    style={{
                      color: colors.error,
                      fontSize: 10,
                      marginTop: 8,
                      fontFamily: 'monospace',
                      opacity: 0.8,
                    }}
                    numberOfLines={10}
                  >
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
// Set up global error handlers to catch unhandled errors and promise rejections
if (typeof ErrorUtils !== 'undefined') {
  const originalGlobalHandler = ErrorUtils.getGlobalHandler();
  
  ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    // Log to Supabase
    logger.logError('Unhandled error', error, {
      category: 'unhandled_error',
      source: 'GlobalErrorHandler',
      tags: {
        isFatal: String(isFatal || false),
      },
    }).catch(() => {
      // Silent fail
    });
    
    // Call original handler if it exists
    if (originalGlobalHandler) {
      originalGlobalHandler(error, isFatal);
    } else {
      // Fallback to console
      console.error('Unhandled error:', error);
    }
  });
}

// Handle unhandled promise rejections
if (typeof global !== 'undefined') {
  const originalUnhandledRejection = (global as any).onunhandledrejection;
  
  (global as any).onunhandledrejection = (event: PromiseRejectionEvent | { reason: any }) => {
    const reason = 'reason' in event ? event.reason : event;
    const error = reason instanceof Error ? reason : new Error(String(reason));
    
    // Log to Supabase
    logger.logError('Unhandled promise rejection', error, {
      category: 'unhandled_promise_rejection',
      source: 'GlobalErrorHandler',
      tags: {
        type: typeof reason,
      },
    }).catch(() => {
      // Silent fail
    });
    
    // Call original handler if it exists
    if (originalUnhandledRejection) {
      originalUnhandledRejection(event);
    } else {
      // Fallback to console
      console.error('Unhandled promise rejection:', reason);
    }
  };
}

// ---------- 4) Config guard ----------
function getConfig() {
  // EAS builds inject EXPO_PUBLIC_* variables into process.env at RUNTIME
  // Also check Constants.extra (from app.config.ts) as fallback
  const expoConfig = Constants.expoConfig as any;
  const manifest = Constants.manifest as any;
  const manifest2 = Constants.manifest2 as any;
  
  // Check all possible sources
  const extra1 = expoConfig?.extra ?? {};
  const extra2 = manifest?.extra ?? {};
  const extra3 = manifest2?.extra?.expoClient?.extra ?? {};
  
  // Priority: 1) process.env (EAS injects EXPO_PUBLIC_* here at runtime), 2) Constants.extra (from app.config.ts), 3) empty string
  // Note: In EAS builds, process.env.EXPO_PUBLIC_* should be available at runtime
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
  
  return { 
    supabaseUrl, 
    supabaseAnonKey
  };
}

function ConfigErrorScreen({ supabaseUrl, supabaseAnonKey }: { supabaseUrl?: string; supabaseAnonKey?: string }) {
  const theme = useAppTheme();
  const colors = theme.colors;

  return (
    <SafeAreaProvider>
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          padding: 20,
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: colors.onBackground, fontSize: 20, fontWeight: '800', marginBottom: 8 }}>
          Missing Configuration
        </Text>
        <Text style={{ color: colors.onBackground, opacity: 0.75, marginBottom: 16 }}>
          The app needs your Supabase settings to start.
        </Text>
        <Text style={{ color: colors.secondary, fontWeight: '700', marginBottom: 6 }}>Required:</Text>
        <Text style={{ color: colors.onBackground, opacity: 0.75 }}>EXPO_PUBLIC_SUPABASE_URL</Text>
        <Text style={{ color: colors.onBackground, opacity: 0.75 }}>EXPO_PUBLIC_SUPABASE_ANON_KEY</Text>
        <Text style={{ color: colors.secondary, fontWeight: '700', marginTop: 16, marginBottom: 6 }}>
          How to set:
        </Text>
        <Text style={{ color: colors.onBackground, opacity: 0.75, marginBottom: 8 }}>
          <Text style={{ fontWeight: '700', color: colors.onBackground }}>Local Development:</Text>
        </Text>
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
        <Text style={{ color: colors.onBackground, opacity: 0.75, marginTop: 12, marginBottom: 4 }}>
          <Text style={{ fontWeight: '700', color: colors.onBackground }}>EAS Builds (Production):</Text>
        </Text>
        <Text style={{ color: colors.onBackground, opacity: 0.75, marginBottom: 4 }}>
          Set as EAS secrets:
        </Text>
        <Text
          style={{
            color: colors.primary,
            backgroundColor: colors.inverseSurface,
            padding: 10,
            borderRadius: 8,
            fontSize: 11,
            fontFamily: 'monospace',
          }}
        >
{`eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "your-url"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-key"`}
        </Text>
        {__DEV__ ? (
          <>
            <Text style={{ color: colors.error, marginTop: 16 }}>
              Debug: url={String(supabaseUrl || '(empty)')}
            </Text>
            <Text style={{ color: colors.error }}>
              Debug: anonKey={supabaseAnonKey ? '(set)' : '(empty)'}
            </Text>
          </>
        ) : null}
      </View>
    </SafeAreaProvider>
  );
}

// ---------- 4) Deep-link → Supabase session bridge (nav-free) ----------
function DeepLinkAuthBridge() {
  useEffect(() => {
    const handleUrl = async (url: string) => {
      try {
        logger.debug('Deep link received:', url);
        
        // Parse URL
        const parsed = Linking.parse(url);
        const qp = parsed.queryParams ?? {};
        const hash = url.includes('#') ? url.split('#')[1] : '';

        // Check for OAuth code in query params (Google OAuth returns code=...)
        const code = qp['code'] as string;
        if (code) {
          logger.debug('OAuth code found, exchanging for session...');
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            logger.error('Code exchange error:', error);
            throw error;
          }
          logger.debug('OAuth code exchanged successfully, session:', !!data.session);
          return; // AuthProvider will react to new session
        }

        // Check for tokens in hash (magic link format: reclaim://auth#access_token=...)
        if (hash) {
          const hashParams = new URLSearchParams(hash);
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          
          if (accessToken && refreshToken) {
            logger.debug('Tokens found in hash, setting session...');
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error) {
              logger.error('Session set error:', error);
              throw error;
            }
            logger.debug('Session set from hash tokens');
            return;
          }
        }

        // Check query params for tokens (fallback)
        const accessToken = qp['access_token'] as string;
        const refreshToken = qp['refresh_token'] as string;
        if (accessToken && refreshToken) {
          logger.debug('Tokens found in query params, setting session...');
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
          logger.debug('Session set from query tokens');
          return;
        }

        // Handle magic link OTP (token_hash)
        const tokenHash = qp['token_hash'] as string || qp['token'] as string;
        if (tokenHash) {
          const email = getLastEmail();
          if (!email) throw new Error('Missing cached email for verifyOtp.');
          const type = (qp['type'] as string) || 'magiclink';
          const { error } = await supabase.auth.verifyOtp({
            type: type as any,
            email,
            token_hash: tokenHash,
          });
          if (error) throw error;
          logger.debug('OTP verified');
          return;
        }

        logger.debug('No auth parameters found in deep link');
      } catch (err) {
        logger.error('Auth deep link error:', err);
      }
    };

    // Cold start - app launched by deep link
    Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl) {
        logger.debug('Initial URL:', initialUrl);
        handleUrl(initialUrl);
      }
    });

    // Warm links - app running when deep link arrives
    const sub = Linking.addEventListener('url', ({ url }) => {
      logger.debug('URL event received:', url);
      handleUrl(url);
    });
    
    return () => sub.remove();
  }, []);

  // Optional: also observe auth state
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // If your AuthProvider routes on session, nothing to do here.
      // console.log('Auth state change, session?', !!session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return null;
}

// ---------- 5) App root ----------
const qc = new QueryClient();

export default function App() {
  const { supabaseUrl, supabaseAnonKey } = getConfig();
  
  // Debug logging in development
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
  if (missingEnv) {
    return (
      <PaperProvider theme={appLightTheme}>
        <ConfigErrorScreen supabaseUrl={supabaseUrl} supabaseAnonKey={supabaseAnonKey} />
      </PaperProvider>
    );
  }

  useNotifications();
  
  // Check for app updates on launch (production builds only)
  const { isUpdatePending, applyUpdate } = useAppUpdates();

  useEffect(() => {
    (async () => {
      try {
        const settings = await getUserSettings();
        if (settings.backgroundSyncEnabled) {
          await enableBackgroundHealthSync();
        } else {
          await disableBackgroundHealthSync();
        }

        // Note: Health permissions should only be requested when user is logged in
        // and explicitly asks to connect. Do not request on app startup.
        // Permissions will be requested via:
        // 1. Onboarding flow (PermissionsScreen)
        // 2. Sleep screen "Connect & sync" UI
        // 3. Integrations screen

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
    <PaperProvider theme={appLightTheme}>
      <ErrorBoundary>
        <SafeAreaProvider>
          <QueryClientProvider client={qc}>
            <AuthProvider>
              <InsightsProvider>
                <DeepLinkAuthBridge />
                <View style={{ flex: 1 }}>
                  <NetworkStatusIndicator />
                  <RootNavigator />
                </View>
              </InsightsProvider>
            </AuthProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    </PaperProvider>
  );
}
