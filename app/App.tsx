// C:\Reclaim\app\App.tsx
import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';

import { AuthProvider } from '@/providers/AuthProvider';
import RootNavigator from '@/routing/RootNavigator';
import { useNotifications } from '@/hooks/useNotifications';
import { supabase } from '@/lib/supabase';
import { getLastEmail } from '@/state/authCache';
import { logger } from '@/lib/logger';

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

// ---------- 2) Simple error boundary ----------
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: any) {
    logger.error('ErrorBoundary caught error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaProvider>
          <View style={{ flex: 1, backgroundColor: '#0b1220', padding: 16, justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8 }}>
              Something went wrong
            </Text>
            <Text style={{ color: '#d9d9d9', marginBottom: 16 }}>
              The app hit an unexpected error. You can try to reload it.
            </Text>
            <TouchableOpacity
              onPress={() => this.setState({ hasError: false, error: undefined })}
              style={{ backgroundColor: '#2563eb', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10 }}
            >
              <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>Reload</Text>
            </TouchableOpacity>
            {__DEV__ && this.state.error ? (
              <Text style={{ color: '#ff9aa2', marginTop: 16 }}>
                {String(this.state.error?.message ?? this.state.error)}
              </Text>
            ) : null}
          </View>
        </SafeAreaProvider>
      );
    }
    return this.props.children;
  }
}

// ---------- 3) Config guard ----------
function getConfig() {
  const expoConfig = Constants.expoConfig as any;
  const extra = expoConfig?.extra ?? {};
  const supabaseUrl = extra?.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const supabaseAnonKey = extra?.supabaseAnonKey ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
  
  // Also check direct env access
  const envUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const envKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  
  return { 
    supabaseUrl: supabaseUrl || envUrl || '', 
    supabaseAnonKey: supabaseAnonKey || envKey || '' 
  };
}

function ConfigErrorScreen({ supabaseUrl, supabaseAnonKey }: { supabaseUrl?: string; supabaseAnonKey?: string }) {
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: '#0b1220', padding: 20, justifyContent: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 8 }}>Missing Configuration</Text>
        <Text style={{ color: '#d9d9d9', marginBottom: 16 }}>
          The app needs your Supabase settings to start.
        </Text>
        <Text style={{ color: '#a3e635', fontWeight: '700', marginBottom: 6 }}>Required:</Text>
        <Text style={{ color: '#d9d9d9' }}>EXPO_PUBLIC_SUPABASE_URL</Text>
        <Text style={{ color: '#d9d9d9' }}>EXPO_PUBLIC_SUPABASE_ANON_KEY</Text>
        <Text style={{ color: '#a3e635', fontWeight: '700', marginTop: 16, marginBottom: 6 }}>How to set:</Text>
        <Text style={{ color: '#d9d9d9', marginBottom: 8 }}>
          • Create a <Text style={{ fontWeight: '700', color: '#fff' }}>.env</Text> file in the project root
        </Text>
        <Text style={{ color: '#9cdcfe', backgroundColor: '#111827', padding: 10, borderRadius: 8 }}>
{`EXPO_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
EXPO_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOi..."`}
        </Text>
        <Text style={{ color: '#d9d9d9', marginTop: 12 }}>
          Then rebuild (for native): <Text style={{ fontWeight: '700', color: '#fff' }}>eas build</Text> and install again.
        </Text>
        {__DEV__ ? (
          <>
            <Text style={{ color: '#ff9aa2', marginTop: 16 }}>
              Debug: url={String(supabaseUrl || '(empty)')}
            </Text>
            <Text style={{ color: '#ff9aa2' }}>
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
  const missingEnv = !supabaseUrl || !supabaseAnonKey;
  if (missingEnv) {
    return <ConfigErrorScreen supabaseUrl={supabaseUrl} supabaseAnonKey={supabaseAnonKey} />;
  }

  useNotifications();

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
    <ErrorBoundary>
      <SafeAreaProvider>
        <QueryClientProvider client={qc}>
          <AuthProvider>
            <DeepLinkAuthBridge />
            <RootNavigator />
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
