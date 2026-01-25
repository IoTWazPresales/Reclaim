import React, { useEffect, useState, useCallback } from 'react';
import { NavigationContainer, type LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Image } from 'react-native';
import { ActivityIndicator, useTheme } from 'react-native-paper';

import { useAuth } from '@/providers/AuthProvider';
import AuthScreen from '@/screens/AuthScreen';
import AppNavigator from '@/routing/AppNavigator';
import OnboardingNavigator from '@/routing/OnboardingNavigator';
import { navRef } from '@/navigation/nav';
import { logger } from '@/lib/logger';

import { supabase } from '@/lib/supabase';
import { getHasOnboarded, setHasOnboarded } from '@/state/onboarding';
import type { RootStackParamList } from '@/navigation/types';
import { useReducedMotion } from '@/hooks/useReducedMotion';


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
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [appReady, setAppReady] = useState(false);
  const [hasOnboarded, setHasOnboardedState] = useState<boolean | null>(null);
  const [checkTrigger, setCheckTrigger] = useState(0);

  // prevents onboarding flash: hold splash until one remote attempt completes
  const [remoteChecked, setRemoteChecked] = useState(false);

  const reduceMotion = useReducedMotion();
  const theme = useTheme();

  useEffect(() => {
    logger.debug(`[ENTRY_CHAIN] RootNavigator mounted`);
  }, []);

  // Reset remoteChecked when user changes
  useEffect(() => {
    if (userId) setRemoteChecked(false);
  }, [userId]);

  // PHASE A: local boot
  useEffect(() => {
    (async () => {
      if (!userId) {
        setHasOnboardedState(false);
        setAppReady(true);
        setRemoteChecked(true);
        if (__DEV__) logger.debug('[ONBOARD_FIX] boot: no userId → hasOnboarded=false');
        return;
      }

      const local = await getHasOnboarded(userId);
      logger.debug('[ONBOARD_FIX] boot local=', local);

      // If local is true, set immediately (don't wait for remote)
      // This prevents flash of onboarding when user has already completed it
      if (local === true) {
        setHasOnboardedState(true);
        setAppReady(true);
        // Still trigger remote check for sync, but don't wait
        setCheckTrigger((c) => c + 1);
        return;
      }

      // If local is false or null, set state but wait for remote check
      setHasOnboardedState((prev) => (prev === true ? true : local));
      setAppReady(true);

      // kick remote check
      setCheckTrigger((c) => c + 1);
    })();
  }, [userId]);

  // PHASE B: remote sync
  useEffect(() => {
    (async () => {
      if (!userId) return;

      if (hasOnboarded === true) {
        if (__DEV__) logger.debug('[ONBOARD_FIX] remote sync skipped (already true)');
        setRemoteChecked(true);
        return;
      }

      let remote: boolean | null = null;
      let retryCount = 0;
      const maxRetries = 2;
      
      // Retry logic: if timeout, retry once before giving up
      while (retryCount <= maxRetries && remote === null) {
        try {
          const { data, error } = (await Promise.race([
            supabase.from('profiles').select('has_onboarded').eq('id', userId).maybeSingle(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
          ])) as any;

          if (!error && data) {
            remote = data.has_onboarded === true;
            logger.debug('[ONBOARD_FIX] remote has_onboarded=', remote);
            break; // Success, exit retry loop
          } else {
            logger.debug('[ONBOARD_FIX] remote error=', error?.message || 'timeout');
            if (retryCount < maxRetries) {
              retryCount++;
              // Wait 500ms before retry
              await new Promise(resolve => setTimeout(resolve, 500));
            } else {
              // After max retries, check local flag as fallback
              // If local says true, trust it (user completed onboarding)
              const local = await getHasOnboarded(userId);
              if (local === true) {
                remote = true; // Trust local if remote fails
                logger.debug('[ONBOARD_FIX] remote failed, trusting local=true');
              }
            }
          }
        } catch (err) {
          logger.debug('[ONBOARD_FIX] remote exception=', err instanceof Error ? err.message : 'unknown');
          if (retryCount < maxRetries) {
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 500));
          } else {
            // After max retries, check local flag as fallback
            const local = await getHasOnboarded(userId);
            if (local === true) {
              remote = true;
              logger.debug('[ONBOARD_FIX] remote exception after retries, trusting local=true');
            }
          }
        }
      }
      
      // Always mark remote as checked, even if it failed
      setRemoteChecked(true);

      if (remote === true) {
        setHasOnboardedState(true);

        try {
          const local = await getHasOnboarded(userId);
          if (!local) {
            await setHasOnboarded(userId, true);
            logger.debug('[ONBOARD_FIX] local upgraded → true (from remote)');
          }
        } catch {
          // non-critical
        }
      } else {
        // If remote is false or null, keep current state (don't override local true)
        // But if current state is null and remote is false/null, we need to decide
        // Trust local flag if it exists
        const local = await getHasOnboarded(userId);
        if (local === true) {
          setHasOnboardedState(true);
          logger.debug('[ONBOARD_FIX] remote not-true but local=true → set to true');
        } else {
          logger.debug('[ONBOARD_FIX] remote not-true → keep current state');
        }
      }
    })();
  }, [userId, checkTrigger, hasOnboarded]);

  const onFinishOnboarding = useCallback(async () => {
    logger.debug('[ONBOARD_FIX] onFinishOnboarding called');
    if (!userId) return;

    setHasOnboardedState(true);

    try {
      await setHasOnboarded(userId, true);
      logger.debug('[ONBOARD_FIX] local set true');
    } catch {}

    try {
      const { error } = await supabase.from('profiles').update({ has_onboarded: true }).eq('id', userId);
      if (error) {
        if (__DEV__) logger.debug('[ONBOARD_FIX] supabase sync failed (non-critical):', error);
      } else {
        if (__DEV__) logger.debug('[ONBOARD_FIX] supabase sync ok');
      }
    } catch {
      if (__DEV__) logger.debug('[ONBOARD_FIX] supabase sync exception (non-critical)');
    }

    setCheckTrigger((c) => c + 1);
  }, [userId]);

  useEffect(() => {
    (globalThis as any).__refreshOnboarding = async () => {
      if (!userId) return;

      try {
        const local = await getHasOnboarded(userId);
        setHasOnboardedState((prev) => (prev === true ? true : local));
        logger.debug('[ONBOARD_FIX] __refreshOnboarding local=', local);
      } catch {}

      setRemoteChecked(false);
      setCheckTrigger((prev) => prev + 1);
    };

    return () => {
      delete (globalThis as any).__refreshOnboarding;
    };
  }, [userId]);

  const navKey = session ? 'app' : 'auth';

  // ✅ CRITICAL: force stack remount when onboarding state flips (fixes “tap to unstick”)
  const flowKey = `${navKey}:${session ? (hasOnboarded ? 'ON' : 'OFF') : 'NA'}`;

  const shouldHoldSplash =
    !appReady ||
    hasOnboarded === null ||
    (session && hasOnboarded === false && remoteChecked === false);

  if (shouldHoldSplash) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Image
          source={require('../../assets/splash.png')}
          style={{ width: 160, height: 160, resizeMode: 'contain', marginBottom: 16 }}
        />
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navRef} linking={linking}>
      <Stack.Navigator
        key={flowKey}
        screenOptions={{ headerShown: false, animation: reduceMotion ? 'none' : 'fade' }}
      >
        {session ? (
          hasOnboarded ? (
            <Stack.Screen name="App" component={AppNavigator} />
          ) : (
            <Stack.Screen name="Onboarding">
              {() => <OnboardingNavigator onFinish={onFinishOnboarding} />}
            </Stack.Screen>
          )
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
