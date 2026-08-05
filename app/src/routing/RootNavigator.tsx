import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';

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

import { useReclaimFontsReady } from '@/theme/ReclaimFontsProvider';

import { HEALTH_SYNC_REASON, requestHealthSync } from '@/sync/SyncCoordinator';

import {

  StartupGateProvider,

  StartupSplashDisclaimer,

  runStartupNotificationPermissionGate,

  useStartupGateState,

  type OnboardStatus,

} from '@/startup';



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



export default function RootNavigator() {

  const { session, loading: authLoading } = useAuth();

  const reduceMotion = useReducedMotion();

  const theme = useTheme();

  const fontsReady = useReclaimFontsReady();



  const [onboardStatus, setOnboardStatus] = useState<OnboardStatus>('unknown');



  const startup = useStartupGateState({

    authLoading,

    session,

    onboardStatus,

    fontsReady,

  });



  const splashOpacity = useRef(new Animated.Value(1)).current;

  const loadingBarProgress = useRef(new Animated.Value(0)).current;

  const loadingBarShimmer = useRef(new Animated.Value(0)).current;

  const [splashMounted, setSplashMounted] = useState(true);

  const splashCommittedRef = useRef(false);

  const [splashDismissed, setSplashDismissed] = useState(false);



  const syncFiredForRef = useRef<string | null>(null);



  useEffect(() => {

    logger.debug('[ENTRY_CHAIN] RootNavigator mounted');

  }, []);



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

            // non-critical

          }

          if (!cancelled) setOnboardStatus('yes');

        } else if (!error && data !== null) {

          logger.debug('[ONBOARD] remote=false → no');

          if (!cancelled) setOnboardStatus('no');

        } else if (!error && data === null) {

          logger.debug('[ONBOARD] remote=no row → no');

          if (!cancelled) setOnboardStatus('no');

        } else {

          // Remote error/timeout: keep user in onboarding — do not mark complete.
          logger.debug('[ONBOARD] remote error → fail-safe no (retry on next launch)', error?.message);

          if (!cancelled) setOnboardStatus('no');

        }

      } catch (err) {

        if (cancelled) return;

        logger.debug(
          '[ONBOARD] remote exception → fail-safe no (retry on next launch)',
          err instanceof Error ? err.message : err,
        );

        setOnboardStatus('no');

      }

    })();



    return () => {

      cancelled = true;

    };

  }, [session?.user?.id]);



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



  const onFinishOnboarding = useCallback(async () => {

    logger.debug('[ONBOARD] onFinishOnboarding called');

    setOnboardStatus('yes');

    if (session?.user?.id) {

      markOnboardingComplete(session.user.id).catch((e) => {

        logger.warn('[ONBOARD] markOnboardingComplete failed (non-critical):', e);

      });

    }

  }, [session]);



  useEffect(() => {

    if (!session || onboardStatus !== 'yes') return;

    if (syncFiredForRef.current === session.user.id) return;

    syncFiredForRef.current = session.user.id;



    requestHealthSync({ reason: HEALTH_SYNC_REASON.STARTUP_GATE }).catch((error) => {

      logger.warn('[STARTUP_SYNC] background sync failed (non-blocking):', error);

    });

  }, [session, onboardStatus]);



  useEffect(() => {

    if (startup.phase !== 'notifications') return;



    let cancelled = false;

    void (async () => {

      await runStartupNotificationPermissionGate();

      if (!cancelled) startup.completeNotifications();

    })();



    return () => {

      cancelled = true;

    };

  }, [startup.phase, startup.completeNotifications]);



  const { shouldHoldSplash } = startup;

  useEffect(() => {
    if (startup.routeTarget !== 'app' || !startup.shouldHoldSplash || !splashDismissed) return;
    splashCommittedRef.current = false;
    splashOpacity.setValue(1);
    setSplashMounted(true);
    setSplashDismissed(false);
  }, [startup.routeTarget, startup.shouldHoldSplash, startup.phase, splashDismissed, splashOpacity]);

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

    }).start(() => {

      setSplashMounted(false);

      setSplashDismissed(true);

    });

  }, [shouldHoldSplash, splashOpacity, loadingBarProgress]);



  useEffect(() => {

    if (!splashMounted || splashCommittedRef.current) return;

    const targetProgress = authLoading
      ? 0.45
      : session && onboardStatus === 'unknown'
        ? 0.82
        : startup.phase === 'notifications'
          ? 0.94
          : 0.96;

    Animated.timing(loadingBarProgress, {

      toValue: targetProgress,

      duration: 260,

      useNativeDriver: false,

    }).start();

  }, [splashMounted, authLoading, session, onboardStatus, startup.phase, loadingBarProgress]);

  useEffect(() => {
    if (!splashMounted || splashCommittedRef.current || reduceMotion) {
      loadingBarShimmer.stopAnimation();
      loadingBarShimmer.setValue(0);
      return;
    }

    loadingBarShimmer.setValue(0);
    const loop = Animated.loop(
      Animated.timing(loadingBarShimmer, {
        toValue: 1,
        duration: 1600,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [splashMounted, reduceMotion, loadingBarShimmer]);



  const flowKey = session ? 'signed-in' : 'signed-out';

  const mountAppNavigator = startup.canMountApp && splashDismissed;



  const gateContextValue = useMemo(

    () => ({

      phase: startup.phase,

      routeTarget: startup.routeTarget,

      shouldHoldSplash: startup.shouldHoldSplash,

      canMountApp: startup.canMountApp,

      splashDismissed,

      splashMessage: startup.splashMessage,

      completeDisclaimer: startup.completeDisclaimer,

      completeNotifications: startup.completeNotifications,

      dashboardMotionEnabled: startup.dashboardMotionEnabled,

      enableDashboardMotion: startup.enableDashboardMotion,

    }),

    [startup, splashDismissed],

  );



  return (

    <StartupGateProvider value={gateContextValue}>

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

            ) : mountAppNavigator ? (

              <Stack.Screen name="App" component={AppNavigator} />

            ) : (

              <Stack.Screen name="App">{() => <View style={{ flex: 1, backgroundColor: theme.colors.background }} />}</Stack.Screen>

            )}

          </Stack.Navigator>

        </NavigationContainer>



        {splashMounted && (

          <Animated.View

            style={[styles.splashOverlay, { opacity: splashOpacity, backgroundColor: theme.colors.background }]}

            pointerEvents={splashCommittedRef.current ? 'none' : 'auto'}

          >

            <View style={styles.splashContent}>

              <ReclaimLogo size={360} animate={!reduceMotion} />

              <View style={styles.splashLoadingWrap}>
                <View
                  style={[
                    styles.splashLoadingHalo,
                    { backgroundColor: theme.colors.primary },
                  ]}
                />
                <View
                  style={[
                    styles.splashLoadingTrack,
                    {
                      backgroundColor: theme.dark ? 'rgba(12, 18, 32, 0.88)' : 'rgba(255,255,255,0.62)',
                      borderColor: theme.dark ? 'rgba(83, 201, 202, 0.22)' : 'rgba(83, 201, 202, 0.35)',
                    },
                  ]}
                >
                  <Animated.View
                    style={[
                      styles.splashLoadingFill,
                      {
                        backgroundColor: theme.colors.primary,
                        width: loadingBarProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 220],
                        }),
                      },
                    ]}
                  >
                    <View style={styles.splashLoadingSheen} />
                    {!reduceMotion ? (
                      <Animated.View
                        pointerEvents="none"
                        style={[
                          styles.splashLoadingShimmer,
                          {
                            transform: [
                              {
                                translateX: loadingBarShimmer.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [-48, 240],
                                }),
                              },
                            ],
                          },
                        ]}
                      />
                    ) : null}
                  </Animated.View>
                </View>
              </View>

              <Text style={[styles.splashMessage, { color: theme.colors.onSurfaceVariant }]}>
                {startup.splashMessage}
              </Text>

            </View>

          </Animated.View>

        )}



        <StartupSplashDisclaimer

          visible={startup.phase === 'disclaimer' && startup.disclaimerNeeded === true}

          onComplete={startup.completeDisclaimer}

        />

      </View>

    </StartupGateProvider>

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

  splashLoadingWrap: {
    width: 220,
    marginTop: 10,
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  splashLoadingHalo: {
    position: 'absolute',
    width: 200,
    height: 18,
    borderRadius: 999,
    opacity: 0.22,
  },

  splashLoadingTrack: {
    width: 220,
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },

  splashLoadingFill: {
    height: '100%',
    borderRadius: 999,
    overflow: 'hidden',
  },

  splashLoadingSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },

  splashLoadingShimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 42,
    backgroundColor: 'rgba(255, 255, 255, 0.38)',
  },

  splashMessage: {
    fontSize: 13,
    letterSpacing: 0.2,
  },

});


