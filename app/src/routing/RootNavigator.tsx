import React, { useEffect, useState, useCallback, useRef } from 'react';
import { NavigationContainer, type LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Animated, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import { useAuth } from '@/providers/AuthProvider';
import AuthScreen from '@/screens/AuthScreen';
import AppNavigator from '@/routing/AppNavigator';
import OnboardingNavigator from '@/routing/OnboardingNavigator';
import { navRef } from '@/navigation/nav';
import { logger } from '@/lib/logger';

import { supabase } from '@/lib/supabase';
import { getHasOnboarded } from '@/state/onboarding';
import { markOnboardingComplete } from '@/lib/onboardingService';
import type { RootStackParamList } from '@/navigation/types';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { ReclaimLogo } from '@/components/ReclaimLogo';
import { HealthDisclaimerModal } from '@/components/HealthDisclaimerModal';
import { HEALTH_SYNC_REASON, requestHealthSync } from '@/sync/SyncCoordinator';

const Stack = createNativeStackNavigator<RootStackParamList>();

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['reclaim://'],
  config: {
    screens: {
      Auth: 'auth',
      Onboarding: { path: 'onboarding' },
      App: {
        screens: {
          HomeTabs: {
            screens: {
              Home: 'home',
              Analytics: 'analytics',
              Settings: 'settings',
            },
          },
          Sleep: 'sleep',
          Mood: 'mood',
          Meds: {
            screens: {
              MedsHome: 'meds',
              MedDetails: 'meds/:id',
            },
          },
          Training: 'training',
          Mindfulness: 'mindfulness',
          Meditation: 'meditation',
          Integrations: 'integrations',
          Notifications: 'notifications',
          About: 'about',
          DataPrivacy: 'privacy',
          EvidenceNotes: 'evidence-notes',
          ReclaimMoments: 'moments',
        },
      },
    },
  },
};

// Tri-state for the onboarding check:
//   'unknown' — still checking (splash holds)
//   'yes'     — confirmed onboarded (local=true OR remote=true OR remote timed out with session)
//   'no'      — remote explicitly returned has_onboarded=false
type OnboardStatus = 'unknown' | 'yes' | 'no';

export default function RootNavigator() {
  const { session, loading: authLoading } = useAuth();
  const reduceMotion = useReducedMotion();
  const theme = useTheme();

  const [onboardStatus, setOnboardStatus] = useState<OnboardStatus>('unknown');

  const splashOpacity = useRef(new Animated.Value(1)).current;
  const loadingBarProgress = useRef(new Animated.Value(0)).current;
  const [splashMounted, setSplashMounted] = useState(true);
  const splashCommittedRef = useRef(false);

  // Tracks which userId the startup health sync has already fired for.
  const syncFiredForRef = useRef<string | null>(null);

  useEffect(() => {
    logger.debug('[ENTRY_CHAIN] RootNavigator mounted');
  }, []);

  // ─── Onboarding check ────────────────────────────────────────────────────────
  // Fires when the logged-in user changes. Reads local first; if not set,
  // queries remote once with a 6 s timeout.
  //
  // Resolution rules:
  //   local = true                    → 'yes' (fast path, no remote needed)
  //   remote has_onboarded = true     → upgrade local, 'yes'
  //   remote has_onboarded = false    → 'no'
  //   remote timeout / error          → 'yes' (fail-safe: session exists,
  //                                     almost certainly a returning user)
  //   no session                      → reset to 'unknown' for next login
  useEffect(() => {
    if (!session) {
      setOnboardStatus('unknown');
      return;
    }

    const userId = session.user.id;
    let cancelled = false;

    (async () => {
      try {
        const local = await getHasOnboarded(userId);
        if (cancelled) return;

        if (local === true) {
          logger.debug('[ONBOARD] local=true → yes');
          setOnboardStatus('yes');
          return;
        }

        // Local is false — ask remote.
        logger.debug('[ONBOARD] local=false → querying remote');
        const remoteResult = await Promise.race([
          supabase.from('profiles').select('has_onboarded').eq('id', userId).maybeSingle(),
          new Promise<{ data: null; error: Error }>((resolve) =>
            setTimeout(() => resolve({ data: null, error: new Error('timeout') }), 6000),
          ),
        ]);
        const { data, error } = remoteResult as { data: { has_onboarded?: boolean } | null; error: Error | null };

        if (cancelled) return;

        if (!error && data?.has_onboarded === true) {
          logger.debug('[ONBOARD] remote=true → upgrading local, yes');
          try {
            await markOnboardingComplete(userId);
          } catch {
            // non-critical — local SecureStore upgrade failed, remote already confirmed
          }
          if (!cancelled) setOnboardStatus('yes');
        } else if (!error && data !== null) {
          // Row found, has_onboarded is false (or null)
          logger.debug('[ONBOARD] remote=false → no');
          if (!cancelled) setOnboardStatus('no');
        } else if (!error && data === null) {
          // No profile row yet — new user
          logger.debug('[ONBOARD] remote=no row → no');
          if (!cancelled) setOnboardStatus('no');
        } else {
          // error object returned
          logger.debug('[ONBOARD] remote error → fail-safe yes', error?.message);
          if (!cancelled) {
            markOnboardingComplete(userId).catch(() => {});
            setOnboardStatus('yes');
          }
        }
      } catch (err) {
        // Promise.race timeout or unexpected error
        if (cancelled) return;
        logger.debug('[ONBOARD] remote exception → fail-safe yes', err instanceof Error ? err.message : err);
        markOnboardingComplete(userId).catch(() => {});
        setOnboardStatus('yes');
      }
    })();

    return () => { cancelled = true; };
  }, [session?.user?.id]);

  // completeOnboarding() calls this so Welcome "Skip" (and any path that persists
  // locally without onFinish) can flip RootNavigator off the Onboarding stack.
  const refreshOnboardingFromLocal = useCallback(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    void (async () => {
      try {
        const local = await getHasOnboarded(userId);
        if (local) {
          logger.debug('[ONBOARD] __refreshOnboarding local=true → yes');
          setOnboardStatus('yes');
        }
      } catch {
        // non-fatal
      }
    })();
  }, [session?.user?.id]);

  useEffect(() => {
    (globalThis as any).__refreshOnboarding = refreshOnboardingFromLocal;
    return () => {
      const g = globalThis as any;
      if (g.__refreshOnboarding === refreshOnboardingFromLocal) {
        delete g.__refreshOnboarding;
      }
    };
  }, [refreshOnboardingFromLocal]);

  // ─── onFinishOnboarding ──────────────────────────────────────────────────────
  const onFinishOnboarding = useCallback(async () => {
    logger.debug('[ONBOARD] onFinishOnboarding called');
    setOnboardStatus('yes');
    if (session?.user?.id) {
      markOnboardingComplete(session.user.id).catch((e) => {
        logger.warn('[ONBOARD] markOnboardingComplete failed (non-critical):', e);
      });
    }
  }, [session]);

  // ─── Background startup sync ─────────────────────────────────────────────────
  // Fires once per login, after auth + onboarding resolve.
  useEffect(() => {
    if (!session || onboardStatus !== 'yes') return;
    if (syncFiredForRef.current === session.user.id) return;
    syncFiredForRef.current = session.user.id;

    requestHealthSync({ reason: HEALTH_SYNC_REASON.STARTUP_GATE }).catch((error) => {
      logger.warn('[STARTUP_SYNC] background sync failed (non-blocking):', error);
    });
  }, [session, onboardStatus]);

  // ─── Splash commit ───────────────────────────────────────────────────────────
  // Fades out exactly once, the first time the hold condition is cleared.
  const shouldHoldSplash = authLoading || (!!session && onboardStatus === 'unknown');

  useEffect(() => {
    if (shouldHoldSplash || splashCommittedRef.current) return;
    Animated.timing(loadingBarProgress, {
      toValue: 1,
      duration: 180,
      useNativeDriver: false,
    }).start();
    splashCommittedRef.current = true;
    Animated.timing(splashOpacity, {
      toValue: 0,
      duration: 350,
      useNativeDriver: true,
    }).start(() => setSplashMounted(false));
  }, [shouldHoldSplash, splashOpacity]);

  useEffect(() => {
    if (!splashMounted || splashCommittedRef.current) return;
    const targetProgress = authLoading ? 0.45 : session && onboardStatus === 'unknown' ? 0.82 : 0.96;
    Animated.timing(loadingBarProgress, {
      toValue: targetProgress,
      duration: 260,
      useNativeDriver: false,
    }).start();
  }, [splashMounted, authLoading, session, onboardStatus, loadingBarProgress]);

  // ─── Routing ─────────────────────────────────────────────────────────────────
  // flowKey changes only on sign-in / sign-out — never on onboarding state.
  // This prevents AppNavigator from remounting during the onboarding check.
  const flowKey = session ? 'signed-in' : 'signed-out';

  const splashMessage = authLoading ? 'Checking sign-in...' : 'Loading...';

  return (
    <View style={styles.root}>
      <NavigationContainer ref={navRef} linking={linking}>
        <Stack.Navigator
          key={flowKey}
          screenOptions={{ headerShown: false, animation: reduceMotion ? 'none' : 'fade' }}
        >
          {!session ? (
            <Stack.Screen name="Auth" component={AuthScreen} />
          ) : onboardStatus === 'no' ? (
            <Stack.Screen name="Onboarding">
              {() => <OnboardingNavigator onFinish={onFinishOnboarding} />}
            </Stack.Screen>
          ) : (
            // 'yes' and 'unknown' both render App.
            // Splash covers 'unknown'; when status resolves to 'yes' the
            // App screen is already mounted — splash simply fades away.
            // This means AppNavigator mounts exactly once per login.
            <Stack.Screen name="App">
              {() => (
                <View style={{ flex: 1 }}>
                  <AppNavigator />
                  <HealthDisclaimerModal />
                </View>
              )}
            </Stack.Screen>
          )}
        </Stack.Navigator>
      </NavigationContainer>

      {splashMounted && (
        <Animated.View
          style={[styles.splashOverlay, { opacity: splashOpacity, backgroundColor: theme.colors.background }]}
          pointerEvents={splashCommittedRef.current ? 'none' : 'auto'}
        >
          <View style={styles.splashContent}>
            <ReclaimLogo size={360} />
            <View
              style={[
                styles.splashLoadingTrack,
                {
                  backgroundColor: theme.dark ? 'rgba(22,32,54,0.65)' : 'rgba(255,255,255,0.55)',
                  borderColor: theme.dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)',
                  shadowColor: theme.colors.primary,
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.splashLoadingFill,
                  {
                    backgroundColor: theme.dark ? '#66AEFF' : theme.colors.primary,
                    shadowColor: theme.colors.primary,
                    width: loadingBarProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 220],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>{splashMessage}</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLoadingTrack: {
    width: 220,
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 12,
    marginBottom: 12,
    borderWidth: 1,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  splashLoadingFill: {
    width: 96,
    height: '100%',
    borderRadius: 999,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 7,
  },
});
